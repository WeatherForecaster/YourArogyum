
        package com.YourArogyum.backend.service;

import com.YourArogyum.backend.dto.LoginRequest;
import com.YourArogyum.backend.dto.RegisterRequest;
import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.exception.EmailAlreadyExistsException;
import com.YourArogyum.backend.exception.InvalidCredentialsException;
import com.YourArogyum.backend.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailOtpService emailOtpService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailOtpService emailOtpService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailOtpService = emailOtpService;
    }

    @Transactional
    public User register(RegisterRequest request) {
        String email = EmailOtpService.normalizeEmail(
                request.getEmail()
        );

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(
                    "An account with this email already exists. "
                            + "If you have not verified it, request a new OTP."
            );
        }

        User user = new User();

        // Name is collected later during health assessment.
        String name = request.getName();
        user.setName(
                name == null || name.isBlank()
                        ? null
                        : name.trim()
        );

        user.setEmail(email);
        user.setPasswordHash(
                passwordEncoder.encode(request.getPassword())
        );
        user.setAuthProvider("LOCAL");
        user.setEmailVerified(false);

        user = userRepository.save(user);

        // Send OTP to verify the email address.
        emailOtpService.sendOtp(user);

        return user;
    }

    public User login(LoginRequest request) {
        String email = EmailOtpService.normalizeEmail(
                request.getEmail()
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException(
                        "Invalid email or password."
                ));

        if (!"LOCAL".equals(user.getAuthProvider())
                || user.getPasswordHash() == null
                || !passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash()
        )) {
            throw new InvalidCredentialsException(
                    "Invalid email or password."
            );
        }

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Please verify your email before logging in."
            );
        }

        return user;
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(
                EmailOtpService.normalizeEmail(email)
        ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "User not found."
        ));
    }

    public void resendOtp(String email) {
        User user = userRepository.findByEmail(
                EmailOtpService.normalizeEmail(email)
        ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Unable to resend the code. Check the email address."
        ));

        if (user.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This email is already verified. Please log in."
            );
        }

        emailOtpService.sendOtp(user);
    }

    public User verifyOtp(String email, String otp) {
        return emailOtpService.verifyOtp(email, otp);
    }
}
