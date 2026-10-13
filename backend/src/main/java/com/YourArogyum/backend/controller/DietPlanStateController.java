package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.entity.DietPlanState;
import com.YourArogyum.backend.service.DietPlanStateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/diet-plan")
public class DietPlanStateController {

    private final DietPlanStateService dietPlanStateService;

    public DietPlanStateController(DietPlanStateService dietPlanStateService) {
        this.dietPlanStateService = dietPlanStateService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyDietPlanState(
            Authentication authentication) {
        Optional<DietPlanState> saved = dietPlanStateService.getState(authentication.getName());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("saved", saved.isPresent());
        response.put("stateJson", saved.map(DietPlanState::getStateJson).orElse("{}"));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Boolean>> saveMyDietPlanState(
            @RequestBody Map<String, Object> state,
            Authentication authentication) {
        dietPlanStateService.saveState(authentication.getName(), state);
        return ResponseEntity.ok(Map.of("saved", true));
    }
}
