package com.YourArogyum.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Service to generate text vector embeddings using Google's Gemini embeddings API.
 * Never throws exceptions to callers: returns null if unconfigured, rate-limited,
 * or on network errors.
 */
@Service
public class GeminiEmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbeddingService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.embedding.model:gemini-embedding-001}")
    private String embeddingModel;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiEmbeddingService() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Embeds the given text into a dense vector (float array).
     *
     * @param text input string to embed
     * @return float array embedding, or {@code null} if embedding failed
     */
    public float[] embed(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GeminiEmbeddingService: GEMINI_API_KEY is not configured; skipping embedding.");
            return null;
        }

        if (text == null || text.isBlank()) {
            return null;
        }

        String model = (embeddingModel != null && !embeddingModel.isBlank())
                ? embeddingModel.trim()
                : "gemini-embedding-001";

        return callEmbedApi(model, text);
    }

    private float[] callEmbedApi(String model, String text) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":embedContent";

        Map<String, Object> body = Map.of(
                "content", Map.of(
                        "parts", List.of(Map.of("text", text))
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey.trim());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            String response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    String.class
            ).getBody();

            if (response == null || response.isBlank()) {
                log.warn("GeminiEmbeddingService: Empty response from model {}", model);
                return null;
            }

            JsonNode root = objectMapper.readTree(response);
            JsonNode valuesNode = root.path("embedding").path("values");
            if (valuesNode.isMissingNode() || !valuesNode.isArray() || valuesNode.isEmpty()) {
                valuesNode = root.path("embeddings").path(0).path("values");
            }

            if (valuesNode.isMissingNode() || !valuesNode.isArray() || valuesNode.isEmpty()) {
                log.warn("GeminiEmbeddingService: No embedding values array found in response for model {}", model);
                return null;
            }

            float[] vector = new float[valuesNode.size()];
            for (int i = 0; i < valuesNode.size(); i++) {
                vector[i] = (float) valuesNode.get(i).asDouble();
            }

            return vector;
        } catch (RestClientResponseException e) {
            log.warn("GeminiEmbeddingService: HTTP error {} for model {}: {}",
                    e.getStatusCode().value(), model, e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.warn("GeminiEmbeddingService: API call failed for model {}: {}", model, e.getMessage());
            return null;
        }
    }
}
