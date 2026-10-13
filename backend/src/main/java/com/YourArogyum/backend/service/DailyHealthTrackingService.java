
package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.Assessment;
import com.YourArogyum.backend.entity.DailyHealthLog;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.AssessmentRepository;
import com.YourArogyum.backend.repository.DailyHealthLogRepository;
import com.YourArogyum.backend.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DailyHealthTrackingService {

    private final DailyHealthLogRepository logRepository;
    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;

    public DailyHealthTrackingService(
            DailyHealthLogRepository logRepository,
            UserRepository userRepository,
            AssessmentRepository assessmentRepository) {
        this.logRepository = logRepository;
        this.userRepository = userRepository;
        this.assessmentRepository = assessmentRepository;
    }

    @Transactional
    public Map<String, Object> saveDailyLog(
            String email,
            LocalDate date,
            Double proteinGrams,
            Integer waterMl,
            Double sleepHours,
            Integer activityMinutes,
            Double weightKg) {

        User user = getUser(email);
        LocalDate logDate = date == null ? LocalDate.now() : date;

        validateDailyValues(
                proteinGrams, waterMl, sleepHours, activityMinutes, weightKg);

        DailyHealthLog log = logRepository
                .findByUserAndLogDate(user, logDate)
                .orElseGet(DailyHealthLog::new);

        log.setUser(user);
        log.setLogDate(logDate);

        // Update only supplied fields; preserve previously saved values.
        if (proteinGrams != null) {
            log.setProteinGrams(proteinGrams);
        }

        if (waterMl != null) {
            log.setWaterMl(waterMl);
        }

        if (sleepHours != null) {
            log.setSleepHours(sleepHours);
        }

        if (activityMinutes != null) {
            log.setActivityMinutes(activityMinutes);
        }

        if (weightKg != null) {
            log.setWeightKg(weightKg);
        }

        DailyHealthLog savedLog = logRepository.save(log);
        return toResponse(savedLog);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDailyLog(
            String email,
            LocalDate date) {

        User user = getUser(email);
        LocalDate logDate = date == null ? LocalDate.now() : date;

        return logRepository.findByUserAndLogDate(user, logDate)
                .map(this::toResponse)
                .orElseGet(() -> {
                    Map<String, Object> result = new LinkedHashMap<>();

                    result.put("logDate", logDate);
                    result.put("logged", false);
                    result.put("proteinGrams", null);
                    result.put("waterMl", null);
                    result.put("sleepHours", null);
                    result.put("activityMinutes", null);
                    result.put("weightKg", null);

                    return result;
                });
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWeightHistory(
            String email,
            LocalDate from,
            LocalDate to) {

        User user = getUser(email);

        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;

        if (start.isAfter(end)) {
            throw new IllegalArgumentException(
                    "'from' date must not be after 'to' date.");
        }

        List<Map<String, Object>> history = new ArrayList<>();

        List<DailyHealthLog> logs =
                logRepository.findByUserAndLogDateBetweenOrderByLogDateAsc(
                        user, start, end);

        for (DailyHealthLog log : logs) {
            if (log.getWeightKg() != null) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("date", log.getLogDate());
                item.put("weightKg", log.getWeightKg());
                history.add(item);
            }
        }

        return history;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGoalProgress(String email) {

        User user = getUser(email);

        Assessment assessment = assessmentRepository
                .findByUser_Id(user.getId())
                .orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();

        if (assessment == null) {
            result.put("available", false);
            result.put("message", "Complete your health assessment first.");
            return result;
        }

        // Assessment stores weights as Strings, so parse them safely.
        Double startingWeight = parseWeight(assessment.getWeight());
        Double targetWeight = parseWeight(assessment.getTargetWeight());

        result.put("goal", assessment.getGoal());
        result.put("startingWeightKg", startingWeight);
        result.put("targetWeightKg", targetWeight);

        if (startingWeight == null || targetWeight == null) {
            result.put("available", false);
            result.put("currentWeightKg", null);
            result.put("progressPercent", null);
            result.put("remainingKg", null);
            result.put(
                    "message",
                    "A valid starting weight and target weight are required.");
            return result;
        }

        if (Double.compare(startingWeight, targetWeight) == 0) {
            result.put("available", false);
            result.put("currentWeightKg", startingWeight);
            result.put("progressPercent", null);
            result.put("remainingKg", 0.0);
            result.put(
                    "message",
                    "Your starting weight and target weight are the same.");
            return result;
        }

        // Retrieve recorded weights in chronological order.
        List<DailyHealthLog> logs =
                logRepository.findByUserAndLogDateBetweenOrderByLogDateAsc(
                        user,
                        LocalDate.of(1900, 1, 1),
                        LocalDate.now());

        Double currentWeight = null;

        for (DailyHealthLog log : logs) {
            Double recordedWeight = log.getWeightKg();

            if (recordedWeight != null
                    && Double.isFinite(recordedWeight)
                    && recordedWeight > 0) {
                currentWeight = recordedWeight;
            }
        }

        result.put("currentWeightKg", currentWeight);

        if (currentWeight == null) {
            result.put("available", false);
            result.put("progressPercent", null);
            result.put("remainingKg", null);
            result.put(
                    "message",
                    "Record your weight in today's log to calculate goal progress.");
            return result;
        }

        double totalChange = Math.abs(targetWeight - startingWeight);
        double progress;

        if (targetWeight < startingWeight) {
            // Weight-loss goal.
            progress = ((startingWeight - currentWeight) / totalChange) * 100.0;
        } else {
            // Weight-gain goal.
            progress = ((currentWeight - startingWeight) / totalChange) * 100.0;
        }

        // Keep progress within the displayed 0-100% range.
        progress = Math.max(0.0, Math.min(100.0, progress));

        double remainingKg = Math.abs(targetWeight - currentWeight);

        result.put("available", true);
        result.put("progressPercent", Math.round(progress));
        result.put("remainingKg", Math.round(remainingKg * 10.0) / 10.0);
        result.put("message", "Goal progress calculated.");

        return result;
    }

    private void validateDailyValues(
            Double proteinGrams,
            Integer waterMl,
            Double sleepHours,
            Integer activityMinutes,
            Double weightKg) {

        if (proteinGrams != null
                && (!Double.isFinite(proteinGrams) || proteinGrams < 0)) {
            throw new IllegalArgumentException(
                    "Protein grams must be zero or greater.");
        }

        if (waterMl != null && waterMl < 0) {
            throw new IllegalArgumentException(
                    "Water intake must be zero or greater.");
        }

        if (sleepHours != null
                && (!Double.isFinite(sleepHours)
                || sleepHours < 0 || sleepHours > 24)) {
            throw new IllegalArgumentException(
                    "Sleep hours must be between 0 and 24.");
        }

        if (activityMinutes != null && activityMinutes < 0) {
            throw new IllegalArgumentException(
                    "Activity minutes must be zero or greater.");
        }

        if (weightKg != null
                && (!Double.isFinite(weightKg) || weightKg <= 0)) {
            throw new IllegalArgumentException(
                    "Weight must be greater than zero.");
        }
    }

    private Double parseWeight(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            double weight = Double.parseDouble(value.trim());

            if (!Double.isFinite(weight) || weight <= 0) {
                return null;
            }

            return weight;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Authenticated user not found."));
    }

    private Map<String, Object> toResponse(DailyHealthLog log) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("logDate", log.getLogDate());

        boolean hasLoggedValue =
                log.getProteinGrams() != null
                        || log.getWaterMl() != null
                        || log.getSleepHours() != null
                        || log.getActivityMinutes() != null
                        || log.getWeightKg() != null;

        result.put("logged", hasLoggedValue);
        result.put("proteinGrams", log.getProteinGrams());
        result.put("waterMl", log.getWaterMl());
        result.put("sleepHours", log.getSleepHours());
        result.put("activityMinutes", log.getActivityMinutes());
        result.put("weightKg", log.getWeightKg());

        return result;
    }
}
