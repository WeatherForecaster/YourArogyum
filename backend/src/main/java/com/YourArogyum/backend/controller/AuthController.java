package com.YourArogyum.backend.controller;

import com.YourArogyum.backend.dto.GoogleLoginRequest;
import com.YourArogyum.backend.dto.LoginRequest;
import com.YourArogyum.backend.dto.RegisterRequest;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.security.CustomUserDetailsService;
import com.YourArogyum.backend.service.AuthService;
import com.YourArogyum.backend.service.GoogleAuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;

    public AuthController(
            AuthService authService,
            GoogleAuthService googleAuthService,
            AuthenticationManager authenticationManager,
            CustomUserDetailsService userDetailsService
    ) {
        this.authService = authService;
        this.googleAuthService = googleAuthService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        User user = authService.register(request);

        Map<String, Object> result = new HashMap<>();
        result.put("message",
                "Account created. Check your email for the verification code.");
        result.put("email", user.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || email.isBlank()
                || otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Email and verification code are required.")
            );
        }

        User user = authService.verifyOtp(email, otp);

        // Create a session only after OTP verification succeeds.
        createSession(user.getEmail(), request, response);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Email verified successfully.");
        result.put("id", user.getId());
        result.put("email", user.getEmail());

        if (user.getName() != null) {
            result.put("name", user.getName());
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(
            @RequestBody Map<String, String> body
    ) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Email is required.")
            );
        }

        authService.resendOtp(email);

        return ResponseEntity.ok(
                Map.of("message", "A new verification code has been sent.")
        );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        // This checks the password and rejects unverified accounts.
        authService.login(request);

        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                request.getEmail().trim().toLowerCase(),
                                request.getPassword()
                        )
                );

        saveSession(authentication, httpRequest, httpResponse);

        User user = authService.getUserByEmail(authentication.getName());

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Login successful.");
        result.put("id", user.getId());
        result.put("email", user.getEmail());

        if (user.getName() != null) {
            result.put("name", user.getName());
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        User user = googleAuthService.loginWithGoogle(
                request.getCredential()
        );

        createSession(user.getEmail(), httpRequest, httpResponse);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Google sign-in successful.");
        result.put("id", user.getId());
        result.put("email", user.getEmail());

        if (user.getName() != null) {
            result.put("name", user.getName());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/me")
    public ResponseEntity<?> currentUser(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() instanceof String) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message", "Not logged in.")
            );
        }

        User user = authService.getUserByEmail(authentication.getName());

        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId());
        result.put("email", user.getEmail());

        if (user.getName() != null) {
            result.put("name", user.getName());
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();

        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }

        return ResponseEntity.ok(
                Map.of("message", "Logged out successfully.")
        );
    }

    private void createSession(
            String email,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        UserDetails userDetails =
                userDetailsService.loadUserByUsername(email);

        Authentication authentication =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

        saveSession(authentication, request, response);
    }

    private void saveSession(
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        new HttpSessionSecurityContextRepository()
                .saveContext(context, request, response);
    }
}