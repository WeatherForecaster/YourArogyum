
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WorkoutProgressService(
            WorkoutProgressRepository progressRepository,
            UserRepository userRepository) {
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDailyProgress(
            String email,
            LocalDate date) {

        User user = getUser(email);
        LocalDate logDate = date == null ? LocalDate.now() : date;

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

        if (completedExercises == null) {
            throw new IllegalArgumentException(
                    "Completed exercises are required.");
        }

        if (completedExercises.size() > MAX_EXERCISES) {
            throw new IllegalArgumentException(
                    "Too many completed exercises.");
        }

        // Trim names and remove duplicates while preserving their order.
        LinkedHashSet<String> cleanedNames = new LinkedHashSet<>();

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

            cleanedNames.add(cleaned);
        }

        final String exercisesJson;

        try {
            exercisesJson = objectMapper.writeValueAsString(
                    new ArrayList<>(cleanedNames));
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Could not serialize workout progress.");
        }

        User user = getUser(email);
        LocalDate logDate = date == null ? LocalDate.now() : date;

        WorkoutProgress progress = progressRepository
                .findByUserAndLogDate(user, logDate)
                .orElseGet(WorkoutProgress::new);

        progress.setUser(user);
        progress.setLogDate(logDate);
        progress.setCompletedExercisesJson(exercisesJson);

        WorkoutProgress saved = progressRepository.save(progress);

        return toResponse(saved);
    }

    private Map<String, Object> toResponse(WorkoutProgress progress) {
        List<String> completedExercises;

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
                    "Saved workout progress could not be read.");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", progress.getLogDate());
        result.put("saved", true);
        result.put("completedExercises", completedExercises);

        return result;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user not found."));
    }
}
