
package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.Assessment;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.AssessmentRepository;
import com.YourArogyum.backend.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class DashboardService {

    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final MlPredictionService mlPredictionService;
    private final XaiExplanationService xaiExplanationService;

    public DashboardService(
            AssessmentRepository assessmentRepository,
            UserRepository userRepository,
            MlPredictionService mlPredictionService,
            XaiExplanationService xaiExplanationService) {

        this.assessmentRepository = assessmentRepository;
        this.userRepository = userRepository;
        this.mlPredictionService = mlPredictionService;
        this.xaiExplanationService = xaiExplanationService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Authenticated user not found."));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userName", user.getName());

        Optional<Assessment> optionalAssessment =
                assessmentRepository.findByUser_Id(user.getId());

        if (optionalAssessment.isEmpty()) {
            result.put("assessmentCompleted", false);
            result.put(
                    "message",
                    "Complete your health assessment to view your dashboard."
            );
            result.put("bmi", null);
            result.put("bmiCategory", null);
            result.put("dailyCalories", null);
            result.put("proteinTargetGrams", null);
            result.put("profile", null);

            result.put("mlPrediction", Map.of(
                    "available", false,
                    "message", "Complete your health assessment first."
            ));

            addUnavailableFeatures(result);
            return result;
        }

        Assessment assessment = optionalAssessment.get();
        result.put("assessmentCompleted", true);

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("age", assessment.getAge());
        profile.put("sex", assessment.getSex());
        profile.put("heightCm", assessment.getHeight());
        profile.put("weightKg", assessment.getWeight());
        profile.put("activity", assessment.getActivity());
        profile.put("diet", assessment.getDiet());
        profile.put("goal", assessment.getGoal());
        profile.put("conditions", assessment.getConditions());
        profile.put("medications", assessment.getMedications());
        profile.put("allergies", assessment.getAllergies());
        profile.put("sleep", assessment.getSleep());
        profile.put("water", assessment.getWater());
        profile.put("stress", assessment.getStress());
        profile.put("familyHistory", assessment.getFamilyHistory());

        result.put("profile", profile);

        Double heightCm = parsePositiveNumber(assessment.getHeight());
        Double weightKg = parsePositiveNumber(assessment.getWeight());
        Integer age = parseAge(assessment.getAge());

        Double bmi = null;
        String bmiCategory = null;

        if (heightCm != null && weightKg != null
                && heightCm >= 30 && heightCm <= 260
                && weightKg >= 2 && weightKg <= 500) {

            double heightMetres = heightCm / 100.0;
            bmi = round(weightKg / (heightMetres * heightMetres));

            if (age != null && age >= 18) {
                bmiCategory = getAdultBmiCategory(bmi);
            }
        }

        result.put("bmi", bmi);
        result.put("bmiCategory", bmiCategory);

        Double dailyCalories = calculateDailyCalories(
                age,
                heightCm,
                weightKg,
                assessment.getSex(),
                assessment.getActivity()
        );

        result.put("dailyCalories", dailyCalories);
        result.put(
                "calorieEstimateNote",
                dailyCalories == null
                        ? "Check your age, height, weight, sex, and activity level."
                        : "Estimated from your saved health profile and activity level."
        );

        Double proteinTarget = calculateProteinBaseline(
                age, weightKg, assessment.getConditions()
        );

        result.put("proteinTargetGrams", proteinTarget);
        result.put(
                "proteinEstimateNote",
                proteinTarget == null
                        ? "A protein target is not provided because the available information is insufficient or a medical condition may require individualized advice."
                        : "General adult reference estimate of 0.8 g/kg/day, not a personalized treatment target."
        );

        Map<String, Object> healthIndicators = new LinkedHashMap<>();
        healthIndicators.put("bmi", bmi);
        healthIndicators.put("bmiCategory", bmiCategory);
        healthIndicators.put("note", "BMI is a screening measure, not a diagnosis.");
        result.put("healthIndicators", healthIndicators);

        // Fetch predictions from the Python ML service.
        Map<String, Object> mlPrediction = mlPredictionService.predict(assessment);

        // Enrich each disease result with a plain-language XAI explanation.
        if (Boolean.TRUE.equals(mlPrediction.get("available"))) {
            @SuppressWarnings("unchecked")
            Map<String, Object> mlResult =
                    (Map<String, Object>) mlPrediction.get("result");

            if (mlResult != null) {
                enrichWithExplanation(mlResult, "diabetes");
                enrichWithExplanation(mlResult, "heart");
            }
        }

        result.put("mlPrediction", mlPrediction);

        addUnavailableFeatures(result);
        return result;
    }

    /**
     * Calls the XAI service for {@code diseaseKey} and injects
     * {@code plainExplanation} directly into the disease sub-map.
     * Failures are silent; the field is set to {@code null}.
     */
    @SuppressWarnings("unchecked")
    private void enrichWithExplanation(Map<String, Object> mlResult,
                                       String diseaseKey) {
        Object raw = mlResult.get(diseaseKey);
        if (!(raw instanceof Map)) {
            return;
        }

        // mlResult values come from Jackson deserialisation as LinkedHashMap.
        Map<String, Object> diseaseMap = (Map<String, Object>) raw;
        // Make a mutable copy so we can add the new field.
        Map<String, Object> mutable = new LinkedHashMap<>(diseaseMap);

        String riskLevel = String.valueOf(mutable.getOrDefault("risk_level", ""));

        List<Map<String, Object>> topFactors = null;
        Object rawFactors = mutable.get("top_factors");
        if (rawFactors instanceof List<?> list) {
            topFactors = list.stream()
                    .filter(item -> item instanceof Map)
                    .map(item -> (Map<String, Object>) item)
                    .toList();
        }

        String friendlyDisease = diseaseKey.equals("heart") ? "heart disease" : diseaseKey;
        String explanation = xaiExplanationService.explain(friendlyDisease, riskLevel, topFactors);
        mutable.put("plainExplanation", explanation);

        mlResult.put(diseaseKey, mutable);
    }

    private Double calculateDailyCalories(
            Integer age,
            Double heightCm,
            Double weightKg,
            String sex,
            String activity) {

        if (age == null || age < 18
                || heightCm == null || weightKg == null) {
            return null;
        }

        if (heightCm < 30 || heightCm > 260
                || weightKg < 2 || weightKg > 500) {
            return null;
        }

        String normalizedSex = normalize(sex);
        double sexAdjustment;

        if (normalizedSex.equals("male")
                || normalizedSex.equals("man")) {
            sexAdjustment = 5;
        } else if (normalizedSex.equals("female")
                || normalizedSex.equals("woman")) {
            sexAdjustment = -161;
        } else {
            return null;
        }

        Double activityFactor = getActivityFactor(activity);
        if (activityFactor == null) {
            return null;
        }

        double bmr = (10 * weightKg)
                + (6.25 * heightCm)
                - (5 * age)
                + sexAdjustment;

        return (double) Math.round(bmr * activityFactor);
    }

    private Double calculateProteinBaseline(
            Integer age,
            Double weightKg,
            String conditions) {

        if (age == null || age < 18
                || weightKg == null
                || weightKg < 2 || weightKg > 500) {
            return null;
        }

        String normalizedConditions = normalize(conditions);

        String[] cautionTerms = {
                "kidney", "renal", "dialysis", "ckd",
                "liver disease", "pregnan", "pregnancy"
        };

        for (String term : cautionTerms) {
            if (normalizedConditions.contains(term)) {
                return null;
            }
        }

        return Math.round(weightKg * 0.8 * 10.0) / 10.0;
    }

    private Double getActivityFactor(String activity) {
        String value = normalize(activity);

        if (value.contains("sedentary")
                || value.contains("little or no")
                || value.equals("low")) {
            return 1.2;
        }

        if (value.contains("light")) {
            return 1.375;
        }

        if (value.contains("moderate")) {
            return 1.55;
        }

        if (value.contains("very active")
                || value.contains("very_active")) {
            return 1.725;
        }

        if (value.contains("extra active")
                || value.contains("extra_active")) {
            return 1.9;
        }

        return null;
    }

    private String getAdultBmiCategory(double bmi) {
        if (bmi < 18.5) {
            return "Underweight";
        }
        if (bmi < 25) {
            return "Healthy weight range";
        }
        if (bmi < 30) {
            return "Overweight";
        }
        return "Obesity range";
    }

    private void addUnavailableFeatures(Map<String, Object> result) {
        result.put("goalProgress", Map.of(
                "available", false,
                "message", "Goal progress will appear after progress tracking is implemented."
        ));

        result.put("weightTrend", Map.of(
                "available", false,
                "message", "Weight history has not been implemented yet."
        ));

        result.put("todaysSnapshot", Map.of(
                "available", false,
                "message", "Daily activity and habit logging has not been implemented yet."
        ));
    }

    private Double parsePositiveNumber(String value) {
        try {
            if (value == null || value.isBlank()) {
                return null;
            }

            double number = Double.parseDouble(value.trim());
            return Double.isFinite(number) && number > 0 ? number : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer parseAge(String value) {
        try {
            if (value == null || value.isBlank()) {
                return null;
            }

            int age = Integer.parseInt(value.trim());
            return age >= 1 && age <= 120 ? age : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
