package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.dto.ChatRequest;
import com.YourArogyum.backend.service.GeminiChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final GeminiChatService geminiChatService;

    public ChatController(GeminiChatService geminiChatService) {
        this.geminiChatService = geminiChatService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> chat(
            @Valid @RequestBody ChatRequest request
    ) {
        if (request.messages() == null || request.messages().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "A message is required."
            );
        }

        String reply = geminiChatService.generateReply(request.messages());

        return ResponseEntity.ok(Map.of("reply", reply));
    }
}