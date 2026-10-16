
package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.service.WorkoutProgressService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workout-progress")
@Validated
public class WorkoutProgressController {

    private final WorkoutProgressService progressService;

    public WorkoutProgressController(
            WorkoutProgressService progressService) {
        this.progressService = progressService;
    }

    public record WorkoutProgressRequest(
            @Size(max = 300)
            List<
                    @NotBlank
                    @Size(max = 200)
                            String
                    > completedExercises
    ) {}

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProgress(
            Authentication authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        return ResponseEntity.ok(
                progressService.getDailyProgress(
                        authentication.getName(),
                        date));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> saveMyProgress(
            Authentication authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @Valid @RequestBody WorkoutProgressRequest request) {

        if (request == null || request.completedExercises() == null) {
            throw new IllegalArgumentException(
                    "Completed exercises are required.");
        }

        return ResponseEntity.ok(
                progressService.saveDailyProgress(
                        authentication.getName(),
                        date,
                        request.completedExercises()));
    }
}
