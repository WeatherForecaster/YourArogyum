
package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.entity.WorkoutProgress;
import com.YourArogyum.backend.repository.UserRepository;
import com.YourArogyum.backend.repository.WorkoutProgressRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
public class WorkoutProgressService {

    private static final int MAX_EXERCISES = 300;
    private static final int MAX_EXERCISE_NAME_LENGTH = 200;

    private final WorkoutProgressRepository progressRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public WorkoutProgressService(
            WorkoutProgressRepository progressRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDailyProgress(
            String email,
            LocalDate date) {

        User user = getUser(email);
        LocalDate logDate = resolveDate(date);

        return progressRepository.findByUserAndLogDate(user, logDate)
                .map(this::toResponse)
                .orElseGet(() -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("date", logDate);
                    result.put("saved", false);
                    result.put("completedExercises", List.of());
                    return result;
                });
    }

    @Transactional
    public Map<String, Object> saveDailyProgress(
            String email,
            LocalDate date,
            List<String> completedExercises) {

        List<String> cleanedExercises =
                cleanExercises(completedExercises);

        final String exercisesJson;

        try {
            exercisesJson =
                    objectMapper.writeValueAsString(cleanedExercises);
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not serialize workout progress.",
                    exception);
        }

        User user = getUser(email);
        LocalDate logDate = resolveDate(date);

        WorkoutProgress progress = progressRepository
                .findByUserAndLogDate(user, logDate)
                .orElseGet(WorkoutProgress::new);

        progress.setUser(user);
        progress.setLogDate(logDate);
        progress.setCompletedExercisesJson(exercisesJson);

        WorkoutProgress saved = progressRepository.save(progress);

        return toResponse(saved);
    }

    private List<String> cleanExercises(
            List<String> completedExercises) {

        if (completedExercises == null) {
            throw new IllegalArgumentException(
                    "Completed exercises are required.");
        }

        if (completedExercises.size() > MAX_EXERCISES) {
            throw new IllegalArgumentException(
                    "Too many completed exercises.");
        }

        LinkedHashSet<String> uniqueExercises = new LinkedHashSet<>();

        for (String name : completedExercises) {
            if (name == null || name.isBlank()) {
                throw new IllegalArgumentException(
                        "Exercise names cannot be blank.");
            }

            String cleaned = name.trim();

            if (cleaned.length() > MAX_EXERCISE_NAME_LENGTH) {
                throw new IllegalArgumentException(
                        "An exercise name is too long.");
            }

            uniqueExercises.add(cleaned);
        }

        return new ArrayList<>(uniqueExercises);
    }

    private Map<String, Object> toResponse(
            WorkoutProgress progress) {

        final List<String> completedExercises;

        try {
            List<?> parsed = objectMapper.readValue(
                    progress.getCompletedExercisesJson(),
                    List.class);

            completedExercises = parsed.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .toList();

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Saved workout progress could not be read.",
                    exception);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", progress.getLogDate());
        result.put("saved", true);
        result.put("completedExercises", completedExercises);

        return result;
    }

    private LocalDate resolveDate(LocalDate date) {
        return date != null ? date : LocalDate.now();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user not found."));
    }
}
