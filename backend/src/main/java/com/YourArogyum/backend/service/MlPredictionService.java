
package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.Assessment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class MlPredictionService {

    @Value("${ml.service.url:http://127.0.0.1:8000}")
    private String mlServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> predict(Assessment assessment) {
        Map<String, Object> response = new LinkedHashMap<>();

        try {
            int age = Integer.parseInt(assessment.getAge().trim());

            if (age < 18 || age > 120) {
                throw new IllegalArgumentException(
                        "The current ML model supports adults aged 18 and above."
                );
            }

            Map<String, Object> request = new LinkedHashMap<>();
            request.put("age", age);
            request.put("height", Double.parseDouble(assessment.getHeight().trim()));
            request.put("weight", Double.parseDouble(assessment.getWeight().trim()));
            request.put("activity", mapActivity(assessment.getActivity()));
            request.put("sleep", mapSleep(assessment.getSleep()));
            request.put("stress", mapStress(assessment.getStress()));
            request.put("familyHistory",
                    mapFamilyHistory(assessment.getFamilyHistory()));

            @SuppressWarnings("unchecked")
            Map<String, Object> prediction = restTemplate.postForObject(
                    mlServiceUrl + "/predict",
                    request,
                    Map.class
            );

            if (prediction == null) {
                throw new IllegalStateException(
                        "The ML service returned an empty response."
                );
            }

            response.put("available", true);
            response.put("result", prediction);

        } catch (RestClientException ex) {
            response.put("available", false);
            response.put(
                    "message",
                    "ML predictions are temporarily unavailable. Please try again later."
            );

        } catch (IllegalArgumentException | IllegalStateException ex) {
            response.put("available", false);
            response.put("message", ex.getMessage());

        } catch (Exception ex) {
            response.put("available", false);
            response.put(
                    "message",
                    "Could not generate the ML prediction. Check the assessment data."
            );
        }

        return response;
    }

    private String mapActivity(String value) {
        String normalized = normalize(value);

        if (normalized.contains("sedentary")
                || normalized.contains("little or no")) {
            return "Sedentary";
        }

        if (normalized.contains("light")) {
            return "Lightly active";
        }

        if (normalized.contains("moderate")) {
            return "Moderately active";
        }

        if (normalized.contains("very active")
                || normalized.equals("very")) {
            return "Very active";
        }

        throw new IllegalArgumentException(
                "Unsupported activity value in the saved assessment."
        );
    }

    private String mapSleep(String value) {
        String normalized = normalize(value);

        if (normalized.contains("less than 5")
                || normalized.contains("below 5")
                || normalized.contains("<5")) {
            return "Less than 5 hours";
        }

        if (normalized.contains("5–6")
                || normalized.contains("5-6")
                || normalized.contains("5 to 6")) {
            return "5–6 hours";
        }

        if (normalized.contains("7–8")
                || normalized.contains("7-8")
                || normalized.contains("7 to 8")) {
            return "7–8 hours";
        }

        if (normalized.contains("more than 8")
                || normalized.contains("above 8")
                || normalized.contains(">8")) {
            return "More than 8 hours";
        }

        throw new IllegalArgumentException(
                "Unsupported sleep value in the saved assessment."
        );
    }

    private String mapStress(String value) {
        String normalized = normalize(value);

        if (normalized.equals("low")) {
            return "Low";
        }

        if (normalized.equals("moderate")
                || normalized.equals("medium")) {
            return "Moderate";
        }

        if (normalized.equals("high")) {
            return "High";
        }

        throw new IllegalArgumentException(
                "Unsupported stress value in the saved assessment."
        );
    }

    private String mapFamilyHistory(String value) {
        String normalized = normalize(value);

        boolean diabetes = normalized.contains("diabetes");
        boolean heart = normalized.contains("heart");

        if (diabetes && heart) {
            return "diabetes, heart";
        }

        if (diabetes) {
            return "diabetes";
        }

        if (heart) {
            return "heart";
        }

        return "None";
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim().toLowerCase(Locale.ROOT);
    }
}
