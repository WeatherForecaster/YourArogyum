package com.YourArogyum.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

/**
 * Translates raw SHAP factors from the ML service into a 2-3 sentence
 * plain-language explanation using Gemini.  Failures are swallowed so the
 * dashboard response is never broken by an XAI call.
 */
@Service
public class XaiExplanationService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/"
                    + "gemini-3.5-flash-lite:generateContent";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public XaiExplanationService() {
        var factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(java.time.Duration.ofSeconds(8));
        factory.setReadTimeout(java.time.Duration.ofSeconds(30));
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * @param disease     "diabetes" or "heart disease"
     * @param riskLevel   "Low", "Moderate", or "High"
     * @param topFactors  list of maps, each with keys "feature", "value", "impact"
     * @return plain-language explanation string, or {@code null} if anything fails
     */
    public String explain(String disease,
                          String riskLevel,
                          List<Map<String, Object>> topFactors) {

        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }

        if (topFactors == null || topFactors.isEmpty()) {
            return null;
        }

        try {
            String factorLines = buildFactorLines(topFactors);

            String prompt = """
                    You are a health educator writing for a general audience with no medical training.
                    
                    The user received a %s risk level (%s) from an experimental wellness model \
                    trained on synthetic data. The model is NOT a clinical diagnostic tool.
                    
                    Top contributing factors that the model's SHAP analysis highlighted:
                    %s
                    
                    Write 2-3 clear, friendly sentences that explain in everyday language why \
                    these factors may have influenced the risk estimate. \
                    Do not diagnose the user. Do not use technical statistics or SHAP terminology. \
                    Do not invent factors that are not listed above. \
                    End with: "This is not a medical diagnosis — speak to a healthcare professional \
                    for personalised advice."
                    """.formatted(disease, riskLevel, factorLines);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("role", "user",
                                    "parts", List.of(Map.of("text", prompt)))
                    ),
                    "generationConfig", Map.of(
                            "maxOutputTokens", 300,
                            "temperature", 0.4
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            String raw = restTemplate.exchange(
                    GEMINI_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            ).getBody();

            if (raw == null || raw.isBlank()) {
                return null;
            }

            JsonNode root = objectMapper.readTree(raw);
            JsonNode text = root
                    .path("candidates").path(0)
                    .path("content").path("parts").path(0)
                    .path("text");

            if (text.isMissingNode() || text.asText().isBlank()) {
                return null;
            }

            return text.asText().strip();

        } catch (Exception ex) {
            // Fail silently — the rest of the dashboard response must still work.
            System.err.println("[XaiExplanationService] Explanation call failed: "
                    + ex.getClass().getSimpleName() + ": " + ex.getMessage());
            return null;
        }
    }

    // ---------------------------------------------------------------------------

    private static String buildFactorLines(List<Map<String, Object>> factors) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> factor : factors) {
            String feature = friendlyName(String.valueOf(
                    factor.getOrDefault("feature", "unknown")));
            Object rawImpact = factor.get("impact");
            double impact = rawImpact instanceof Number n ? n.doubleValue() : 0.0;
            String direction = impact > 0 ? "raised risk" : "lowered risk";
            sb.append("- ").append(feature).append(": ").append(direction).append("\n");
        }
        return sb.toString().strip();
    }

    private static String friendlyName(String feature) {
        return feature
                .replace("_", " ")
                .replace("family diabetes", "family history of diabetes")
                .replace("family heart", "family history of heart disease")
                .replace("sleep hours", "sleep duration")
                .replace("bmi", "body mass index (BMI)");
    }
}
