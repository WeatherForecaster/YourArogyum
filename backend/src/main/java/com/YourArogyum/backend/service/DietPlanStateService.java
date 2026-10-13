package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.DietPlanState;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.DietPlanStateRepository;
import com.YourArogyum.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Optional;

@Service
public class DietPlanStateService {

    private static final int MAX_STATE_LENGTH = 500_000;

    private final DietPlanStateRepository dietPlanStateRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DietPlanStateService(
            DietPlanStateRepository dietPlanStateRepository,
            UserRepository userRepository) {
        this.dietPlanStateRepository = dietPlanStateRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Optional<DietPlanState> getState(String email) {
        User user = findUser(email);
        return dietPlanStateRepository.findByUser_Id(user.getId());
    }

    @Transactional
    public void saveState(String email, Map<String, Object> state) {
        if (state == null) {
            throw new IllegalArgumentException("Diet plan state is required.");
        }

        final String stateJson;
        try {
            stateJson = objectMapper.writeValueAsString(state);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Diet plan state is not valid JSON.");
        }

        if (stateJson.length() > MAX_STATE_LENGTH) {
            throw new IllegalArgumentException("Diet plan data is too large to save.");
        }

        User user = findUser(email);
        DietPlanState saved = dietPlanStateRepository
                .findByUser_Id(user.getId())
                .orElseGet(DietPlanState::new);

        saved.setUser(user);
        saved.setStateJson(stateJson);
        dietPlanStateRepository.save(saved);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user not found."));
    }
}
