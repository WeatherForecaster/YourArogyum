
package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.entity.Assessment;
import com.YourArogyum.backend.service.AssessmentService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/assessment")
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> saveAssessment(
            @RequestBody Map<String, String> data,
            Authentication authentication) {

        Assessment saved = assessmentService.saveAssessment(
                authentication.getName(), data);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Assessment saved successfully.");
        response.put("completed", true);
        response.put("assessment", toMap(saved));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getAssessment(
            Authentication authentication) {

        return assessmentService.getAssessment(authentication.getName())
                .map(assessment -> {
                    Map<String, Object> response = new LinkedHashMap<>();
                    response.put("completed", true);
                    response.put("assessment", toMap(assessment));
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    Map<String, Object> response = new LinkedHashMap<>();
                    response.put("completed", false);
                    response.put("assessment", null);
                    return ResponseEntity.ok(response);
                });
    }

    private Map<String, String> toMap(Assessment assessment) {
        Map<String, String> data = new LinkedHashMap<>();

        data.put("fullName", safe(assessment.getFullName()));
        data.put("age", safe(assessment.getAge()));
        data.put("sex", safe(assessment.getSex()));
        data.put("height", safe(assessment.getHeight()));
        data.put("weight", safe(assessment.getWeight()));

        data.put("conditions", safe(assessment.getConditions()));
        data.put("healthConcerns", safe(assessment.getHealthConcerns()));
        data.put("familyHistory", safe(assessment.getFamilyHistory()));
        data.put("allergies", safe(assessment.getAllergies()));
        data.put("medications", safe(assessment.getMedications()));

        data.put("activity", safe(assessment.getActivity()));
        data.put("sleep", safe(assessment.getSleep()));
        data.put("dailyActivity", safe(assessment.getDailyActivity()));
        data.put("workLifestyle", safe(assessment.getWorkLifestyle()));
        data.put("water", safe(assessment.getWater()));
        data.put("stress", safe(assessment.getStress()));

        data.put("diet", safe(assessment.getDiet()));
        data.put("foodAllergies", safe(assessment.getFoodAllergies()));
        data.put("foodsToAvoid", safe(assessment.getFoodsToAvoid()));
        data.put("foodPreferences", safe(assessment.getFoodPreferences()));

        data.put("goal", safe(assessment.getGoal()));
        data.put("targetWeight", safe(assessment.getTargetWeight()));
        data.put("fitnessLevel", safe(assessment.getFitnessLevel()));
        data.put("bmi", safe(assessment.getBmi()));

        return data;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
