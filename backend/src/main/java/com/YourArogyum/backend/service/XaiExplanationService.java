
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
 * Converts SHAP feature contributions from the ML service into a
 * plain-language explanation using Gemini.
 *
 * SHAP contributions describe the model's prediction behavior.
 * They do not establish actual medical risk or causation.
 *
 * Failures return null so an unavailable explanation does not
 * prevent the rest of the dashboard from loading.
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
     * @param disease    Disease category being explained
     * @param riskLevel  Predicted model category
     * @param topFactors SHAP factors containing feature, value and impact
     * @return Plain-language explanation, or null if unavailable
     */
    public String explain(
            String disease,
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
                    You are a health educator writing for a general audience.

                    The user received a predicted category of "%s" for %s
                    from an experimental wellness model trained on synthetic
                    data. This model is not clinically validated and is
                    not a medical diagnostic tool.

                    The following are SHAP contributions for the model's
                    predicted category:

                    %s

                    Explain the most important listed factors in 2-3 clear,
                    friendly sentences using everyday language.

                    A positive SHAP impact means that a factor supports the
                    model's predicted category. A negative impact means that
                    it opposes the predicted category. An approximately zero
                    impact has little contribution. Larger absolute impacts
                    indicate stronger relative contributions among the listed
                    factors for this prediction.

                    These directions describe the model's behavior. Do not
                    interpret them as proof that real-world disease risk
                    increased or decreased. Do not claim causation, diagnose
                    the user, invent factors, or make unsupported medical
                    recommendations. Avoid technical statistics and SHAP
                    terminology in the explanation.

                    End with this exact sentence:
                    "This is not a medical diagnosis — speak to a healthcare
                    professional for personalised advice."
                    """.formatted(riskLevel, disease, factorLines);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "role", "user",
                                    "parts", List.of(
                                            Map.of("text", prompt)
                                    )
                            )
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
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            if (text.isMissingNode() || text.asText().isBlank()) {
                return null;
            }

            return text.asText().strip();

        } catch (Exception ex) {
            // Keep the dashboard available if Gemini explanations fail.
            System.err.println(
                    "[XaiExplanationService] Explanation call failed: "
                            + ex.getClass().getSimpleName()
                            + ": "
                            + ex.getMessage()
            );

            return null;
        }
    }

    /**
     * Converts SHAP results into clear descriptions of their
     * direction relative to the predicted model category.
     */
    private static String buildFactorLines(
            List<Map<String, Object>> factors) {

        StringBuilder sb = new StringBuilder();

        for (Map<String, Object> factor : factors) {

            String feature = friendlyName(
                    String.valueOf(
                            factor.getOrDefault("feature", "unknown")
                    )
            );

            Object rawImpact = factor.get("impact");

            double impact = rawImpact instanceof Number number
                    ? number.doubleValue()
                    : 0.0;

            if (!Double.isFinite(impact)) {
                impact = 0.0;
            }

            String direction;

            if (Math.abs(impact) < 1e-9) {
                direction =
                        "has approximately no contribution to the "
                                + "predicted category";

            } else if (impact > 0) {
                direction =
                        "supports the model's predicted category";

            } else {
                direction =
                        "opposes the model's predicted category";
            }

            sb.append("- ")
                    .append(feature)
                    .append(": ")
                    .append(direction)
                    .append(" (absolute SHAP contribution: ")
                    .append(String.format(
                            java.util.Locale.ROOT,
                            "%.6f",
                            Math.abs(impact)
                    ))
                    .append(")\n");
        }

        return sb.toString().strip();
    }

    /**
     * Converts technical feature names into more readable labels.
     */
    private static String friendlyName(String feature) {
        return feature
                .replace("_", " ")
                .replace(
                        "family diabetes",
                        "family history of diabetes"
                )
                .replace(
                        "family heart",
                        "family history of heart disease"
                )
                .replace(
                        "sleep hours",
                        "sleep duration"
                )
                .replace(
                        "bmi",
                        "body mass index (BMI)"
                );
    }
}
