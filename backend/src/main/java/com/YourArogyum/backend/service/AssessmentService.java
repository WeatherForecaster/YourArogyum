
package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.Assessment;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.AssessmentRepository;
import com.YourArogyum.backend.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;

    public AssessmentService(
            AssessmentRepository assessmentRepository,
            UserRepository userRepository) {
        this.assessmentRepository = assessmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Assessment saveAssessment(String email, Map<String, String> data) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Authenticated user not found."));

        validateRequired(data);

        // Update this user's existing assessment instead of creating duplicates.
        Assessment assessment = assessmentRepository
                .findByUser_Id(user.getId())
                .orElseGet(Assessment::new);

        assessment.setUser(user);

        assessment.setFullName(value(data, "fullName"));
        assessment.setAge(value(data, "age"));
        assessment.setSex(value(data, "sex"));
        assessment.setHeight(value(data, "height"));
        assessment.setWeight(value(data, "weight"));

        assessment.setConditions(value(data, "conditions"));
        assessment.setHealthConcerns(value(data, "healthConcerns"));
        assessment.setFamilyHistory(value(data, "familyHistory"));
        assessment.setAllergies(value(data, "allergies"));
        assessment.setMedications(value(data, "medications"));

        assessment.setActivity(value(data, "activity"));
        assessment.setSleep(value(data, "sleep"));
        assessment.setDailyActivity(value(data, "dailyActivity"));
        assessment.setWorkLifestyle(value(data, "workLifestyle"));
        assessment.setWater(value(data, "water"));
        assessment.setStress(value(data, "stress"));

        assessment.setDiet(value(data, "diet"));
        assessment.setFoodAllergies(value(data, "foodAllergies"));
        assessment.setFoodsToAvoid(value(data, "foodsToAvoid"));
        assessment.setFoodPreferences(value(data, "foodPreferences"));

        assessment.setGoal(value(data, "goal"));
        assessment.setTargetWeight(value(data, "targetWeight"));
        assessment.setFitnessLevel(value(data, "fitnessLevel"));

        String height = value(data, "height");
        String weight = value(data, "weight");

        double heightInMetres = Double.parseDouble(height) / 100.0;
        String calculatedBmi = String.format(
                java.util.Locale.US,
                "%.1f",
                Double.parseDouble(weight) /
                        (heightInMetres * heightInMetres)
        );

        assessment.setBmi(calculatedBmi);

        return assessmentRepository.save(assessment);
    }

    @Transactional(readOnly = true)
    public Optional<Assessment> getAssessment(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Authenticated user not found."));

        return assessmentRepository.findByUser_Id(user.getId());
    }

    private void validateRequired(Map<String, String> data) {

        String[] required = {
                "age", "sex", "height", "weight",
                "sleep", "activity", "water", "diet"
        };

        for (String field : required) {
            String fieldValue = data.get(field);

            if (fieldValue == null || fieldValue.isBlank()) {
                throw new IllegalArgumentException(
                        "Missing required field: " + field);
            }
        }

        try {
            int age = Integer.parseInt(data.get("age").trim());
            double height = Double.parseDouble(data.get("height").trim());
            double weight = Double.parseDouble(data.get("weight").trim());

            if (age < 1 || age > 120 ||
                    height < 30 || height > 260 ||
                    weight < 2 || weight > 500) {
                throw new IllegalArgumentException(
                        "Age, height or weight is outside the allowed range.");
            }
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(
                    "Age, height and weight must be valid numbers.");
        }
    }

    private String value(Map<String, String> data, String key) {
        String fieldValue = data.get(key);
        return fieldValue == null ? "" : fieldValue.trim();
    }
}
