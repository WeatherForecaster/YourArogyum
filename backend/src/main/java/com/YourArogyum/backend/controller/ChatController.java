package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.dto.ChatRequest;
import com.YourArogyum.backend.entity.Assessment;
import com.YourArogyum.backend.service.AssessmentService;
import com.YourArogyum.backend.service.GeminiChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final GeminiChatService geminiChatService;
    private final AssessmentService assessmentService;

    public ChatController(
            GeminiChatService geminiChatService,
            AssessmentService assessmentService
    ) {
        this.geminiChatService = geminiChatService;
        this.assessmentService = assessmentService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> chat(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Please log in to use the AI assistant."
            );
        }

        if (request.messages() == null || request.messages().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "A message is required."
            );
        }

        Assessment assessment = null;
        try {
            Optional<Assessment> optAssessment = assessmentService.getAssessment(authentication.getName());
            if (optAssessment.isPresent()) {
                assessment = optAssessment.get();
            }
        } catch (Exception ignored) {
            // If user has not completed assessment yet, proceed normally without profile block
        }

        String reply = geminiChatService.generateReply(request.messages(), assessment);

        return ResponseEntity.ok(Map.of("reply", reply));
    }
}