package com.YourArogyum.backend.service;

import com.YourArogyum.backend.dto.ChatRequest;
import com.YourArogyum.backend.entity.Assessment;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class GeminiChatService {

    private static final int MAX_GEMINI_ATTEMPTS = 3;

    @Value("${gemini.api.key}")
    private String apiKey;

    private final HealthKnowledgeService knowledgeService;

    public GeminiChatService(HealthKnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(java.time.Duration.ofSeconds(10));
        factory.setReadTimeout(java.time.Duration.ofSeconds(45));
        return new RestTemplate(factory);
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/"
                    + "gemini-3.5-flash-lite:generateContent";

    public String generateReply(List<ChatRequest.Message> messages) {
        return generateReply(messages, null);
    }

    public String generateReply(List<ChatRequest.Message> messages, Assessment assessment) {
        if (messages == null || messages.isEmpty()) {
            throw new IllegalArgumentException("Please enter a message.");
        }

        if (apiKey == null || apiKey.isBlank()) {
            System.err.println("Gemini configuration error: API key is missing.");
            throw new IllegalStateException("The AI assistant is not configured yet.");
        }

        // Retrieve the most recent user question.
        String latestQuestion = "";
        for (int i = messages.size() - 1; i >= 0; i--) {
            ChatRequest.Message message = messages.get(i);
            if (message != null
                    && "user".equalsIgnoreCase(message.role())
                    && message.content() != null
                    && !message.content().isBlank()) {
                latestQuestion = message.content();
                break;
            }
        }

        // Retrieve relevant passages from the local health knowledge base.
        HealthKnowledgeService.RetrievalResult retrieved =
                knowledgeService.retrieve(latestQuestion);

        List<Map<String, Object>> contents = new ArrayList<>();

        // Include recent conversation context.
        int start = Math.max(0, messages.size() - 12);
        for (int i = start; i < messages.size(); i++) {
            ChatRequest.Message message = messages.get(i);
            if (message == null || message.content() == null || message.content().isBlank()) {
                continue;
            }

            String role = "assistant".equalsIgnoreCase(message.role()) ? "model" : "user";
            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", message.content()))
            ));
        }

        if (contents.isEmpty()) {
            throw new IllegalArgumentException("Please enter a message.");
        }

        String profileBlock = buildProfileBlock(assessment);

        String systemInstructionText = """
                You are YourArogyum's personal wellness assistant.

                Give clear, practical, empathetic guidance about general
                nutrition, physical activity, sleep, hydration, and
                preventive wellness.

                Do not diagnose diseases, prescribe medicines, or claim
                that risk predictions are medically validated. Do not
                invent user health data. For serious symptoms, recommend
                professional medical care.

                Use retrieved reference passages as evidence when relevant.
                Cite a supporting retrieved passage using its exact label,
                such as [S1] or [S2]. Never invent a source label or URL.

                If the retrieved information does not answer the question,
                say so when appropriate. Do not pretend that an answer
                came from a source that does not support it.

                Explain uncertainty and remind users that general wellness
                information is not a substitute for a clinician.
                """
                + profileBlock
                + (retrieved.context().isBlank()
                ? ""
                : "\n\nRetrieved health reference passages:\n" + retrieved.context());

        Map<String, Object> requestBody = Map.of(
                "systemInstruction",
                Map.of("parts", List.of(Map.of("text", systemInstructionText))),
                "contents", contents,
                "generationConfig", Map.of(
                        "maxOutputTokens", 2500,
                        "thinkingConfig", Map.of("thinkingLevel", "low")
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        try {
            String response = executeGeminiRequestWithRetry(requestBody, headers);

            if (response == null || response.isBlank()) {
                throw new IllegalStateException("The AI returned an empty response.");
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode candidate = root.path("candidates").path(0);

            System.out.println("Gemini finish reason: "
                    + candidate.path("finishReason").asText("UNKNOWN"));
            System.out.println("Gemini text parts: "
                    + candidate.path("content").path("parts").size());

            JsonNode textNode = candidate.path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode() || textNode.asText().isBlank()) {
                System.err.println("Gemini returned no text. Check its response structure.");
                throw new IllegalStateException(
                        "The AI returned an empty response. Please try again.");
            }

            String answer = textNode.asText();

            // Append only the documents actually retrieved for this question.
            if (!retrieved.sources().isEmpty()) {
                String sourceList = retrieved.sources().stream()
                        .map(source -> "[" + source.id() + "] "
                                + source.title() + " — " + source.url())
                        .collect(java.util.stream.Collectors.joining("\n"));
                answer += "\n\nReference sources retrieved:\n" + sourceList;
            }

            return answer;

        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("Gemini integration error type: "
                    + e.getClass().getSimpleName());
            e.printStackTrace();
            throw new IllegalStateException(
                    "Unable to get an AI response right now. Please try again.", e);
        }
    }

    /**
     * Sends the Gemini request and retries only likely temporary provider/network failures.
     * Permanent HTTP errors (for example, an invalid API key) are not retried.
     */
    private String executeGeminiRequestWithRetry(
            Map<String, Object> requestBody,
            HttpHeaders headers) {

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        for (int attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
            try {
                return restTemplate.exchange(
                        GEMINI_URL,
                        HttpMethod.POST,
                        entity,
                        String.class
                ).getBody();

            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                System.err.println("Gemini HTTP error status: " + status);

                // Provider error bodies do not contain the request API key, but keep
                // log output short so unrelated provider details do not flood the console.
                String providerBody = e.getResponseBodyAsString();
                if (providerBody != null && !providerBody.isBlank()) {
                    int maxLogChars = 1000;
                    System.err.println("Gemini provider error body: "
                            + providerBody.substring(0, Math.min(providerBody.length(), maxLogChars)));
                }

                if (isRetryableStatus(status) && attempt < MAX_GEMINI_ATTEMPTS) {
                    System.err.println("Temporary Gemini HTTP " + status
                            + ". Retrying attempt " + (attempt + 1) + "/"
                            + MAX_GEMINI_ATTEMPTS + ".");
                    waitBeforeRetry(attempt);
                    continue;
                }

                if (isRetryableStatus(status)) {
                    throw new IllegalStateException(
                            "The AI service is temporarily busy or unavailable. "
                                    + "Please try again in a moment.", e);
                }

                if (status == 401 || status == 403) {
                    throw new IllegalStateException(
                            "The AI service authentication or permissions check failed. "
                                    + "Please check the server-side Gemini configuration.", e);
                }

                throw new IllegalStateException(
                        "The AI service could not process your request (HTTP " + status
                                + "). Please try again later.", e);

            } catch (ResourceAccessException e) {
                System.err.println("Gemini connection/timeout error on attempt "
                        + attempt + "/" + MAX_GEMINI_ATTEMPTS + ": "
                        + e.getClass().getSimpleName());

                if (attempt < MAX_GEMINI_ATTEMPTS) {
                    waitBeforeRetry(attempt);
                    continue;
                }

                throw new IllegalStateException(
                        "The AI service did not respond after several attempts. "
                                + "Please try again.", e);
            }
        }

        // The loop normally returns or throws before reaching this line.
        throw new IllegalStateException("The AI service is temporarily unavailable. Please try again.");
    }

    private boolean isRetryableStatus(int status) {
        return status == 429
                || status == 500
                || status == 502
                || status == 503
                || status == 504;
    }

    private void waitBeforeRetry(int failedAttempt) {
        // Backoff: wait 1 second after the first failure, then 2 seconds.
        long delayMillis = 1000L * failedAttempt;
        try {
            Thread.sleep(delayMillis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "The AI retry was interrupted. Please try again.", e);
        }
    }

    private String buildProfileBlock(Assessment assessment) {
        if (assessment == null) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        if (hasValue(assessment.getAge())) {
            sb.append("- Age: ").append(assessment.getAge().trim()).append("\n");
        }
        if (hasValue(assessment.getSex())) {
            sb.append("- Gender/Sex: ").append(assessment.getSex().trim()).append("\n");
        }
        if (hasValue(assessment.getHeight())) {
            sb.append("- Height: ").append(assessment.getHeight().trim()).append(" cm\n");
        }
        if (hasValue(assessment.getWeight())) {
            sb.append("- Weight: ").append(assessment.getWeight().trim()).append(" kg\n");
        }
        if (hasValue(assessment.getConditions())) {
            sb.append("- Medical conditions: ").append(assessment.getConditions().trim()).append("\n");
        }
        String allergies = combineAllergies(assessment.getAllergies(), assessment.getFoodAllergies());
        if (!allergies.isBlank()) {
            sb.append("- Allergies: ").append(allergies).append("\n");
        }
        if (hasValue(assessment.getDiet())) {
            sb.append("- Diet preference: ").append(assessment.getDiet().trim()).append("\n");
        }
        if (hasValue(assessment.getGoal())) {
            sb.append("- Fitness/wellness goal: ").append(assessment.getGoal().trim()).append("\n");
        }

        if (sb.isEmpty()) {
            return "";
        }

        return "\n\nUser health profile (tailor advice to this user context, strictly respecting dietary preferences, conditions, and allergies):\n"
                + sb.toString().trim() + "\n";
    }

    private static boolean hasValue(String str) {
        if (str == null || str.isBlank()) {
            return false;
        }
        String lower = str.trim().toLowerCase();
        return !lower.equals("none") && !lower.equals("nil") && !lower.equals("n/a") && !lower.equals("no") && !lower.equals("healthy");
    }

    private static String combineAllergies(String general, String food) {
        boolean hasG = hasValue(general);
        boolean hasF = hasValue(food);
        if (hasG && hasF) {
            return general.trim() + ", " + food.trim();
        } else if (hasG) {
            return general.trim();
        } else if (hasF) {
            return food.trim();
        }
        return "";
    }
}
