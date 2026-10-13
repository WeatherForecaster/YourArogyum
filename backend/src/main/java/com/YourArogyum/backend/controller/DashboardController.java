
package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.service.DashboardService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyDashboard(
            Authentication authentication) {

        Map<String, Object> dashboard =
                dashboardService.getDashboard(authentication.getName());

        return ResponseEntity.ok(dashboard);
    }
}
