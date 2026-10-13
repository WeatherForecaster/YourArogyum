
package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.service.DailyHealthTrackingService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health-tracking")
@Validated
public class DailyHealthTrackingController {

    private final DailyHealthTrackingService trackingService;

    public DailyHealthTrackingController(
            DailyHealthTrackingService trackingService) {
        this.trackingService = trackingService;
    }

    public record DailyLogRequest(
            @DecimalMin("0.0")
            @DecimalMax("500.0")
            Double proteinGrams,

            @Min(0)
            @Max(15000)
            Integer waterMl,

            @DecimalMin("0.0")
            @DecimalMax("24.0")
            Double sleepHours,

            @Min(0)
            @Max(1440)
            Integer activityMinutes,

            @DecimalMin("2.0")
            @DecimalMax("500.0")
            Double weightKg
    ) {}

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getDailyLog(
            Authentication authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        return ResponseEntity.ok(
                trackingService.getDailyLog(
                        authentication.getName(), date));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> saveDailyLog(
            Authentication authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @Valid @RequestBody DailyLogRequest request) {

        return ResponseEntity.ok(
                trackingService.saveDailyLog(
                        authentication.getName(),
                        date,
                        request.proteinGrams(),
                        request.waterMl(),
                        request.sleepHours(),
                        request.activityMinutes(),
                        request.weightKg()));
    }

    @GetMapping("/weight-history")
    public ResponseEntity<?> getWeightHistory(
            Authentication authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {

        return ResponseEntity.ok(
                trackingService.getWeightHistory(
                        authentication.getName(), from, to));
    }

    @GetMapping("/goal-progress")
    public ResponseEntity<Map<String, Object>> getGoalProgress(
            Authentication authentication) {

        return ResponseEntity.ok(
                trackingService.getGoalProgress(
                        authentication.getName()));
    }
}
