        package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class EmailOtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.mail.from}")
    private String fromEmail;

    public EmailOtpService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
    }

    public void sendOtp(User user) {
        LocalDateTime now = LocalDateTime.now();

        if (user.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This email is already verified. Please log in."
            );
        }

        if (user.getOtpLastSentAt() != null
                && now.isBefore(
                user.getOtpLastSentAt().plusSeconds(60)
        )) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait 60 seconds before requesting another OTP."
            );
        }

        String otp = String.format(
                Locale.ROOT,
                "%06d",
                secureRandom.nextInt(1_000_000)
        );

        user.setOtpHash(passwordEncoder.encode(otp));
        user.setOtpExpiresAt(now.plusMinutes(5));
        user.setOtpLastSentAt(now);
        user.setOtpAttempts(0);

        userRepository.save(user);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("Your YourArogyum verification code");

        String greeting = user.getName() == null
                || user.getName().isBlank()
                ? "Hello,"
                : "Hello " + user.getName().trim() + ",";

        message.setText(
                greeting + "\n\n"
                        + "Your YourArogyum verification code is: "
                        + otp + "\n\n"
                        + "This code expires in 5 minutes. You have a maximum "
                        + "of 5 verification attempts.\n\n"
                        + "If you did not request this code, you can ignore this email."
        );

        mailSender.send(message);
    }

    public User verifyOtp(String email, String otp) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid or expired verification code."
                ));

        if (user.isEmailVerified()) {
            return user;
        }

        if (user.getOtpAttempts() >= 5) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many incorrect attempts. Request a new code."
            );
        }

        if (user.getOtpHash() == null
                || user.getOtpExpiresAt() == null
                || !LocalDateTime.now().isBefore(user.getOtpExpiresAt())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The verification code has expired. Request a new code."
            );
        }

        if (otp == null
                || !otp.matches("\\d{6}")
                || !passwordEncoder.matches(otp, user.getOtpHash())) {

            user.setOtpAttempts(user.getOtpAttempts() + 1);
            userRepository.saveAndFlush(user);

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid or expired verification code."
            );
        }

        user.setEmailVerified(true);
        clearOtp(user);

        return userRepository.save(user);
    }

    public void clearOtp(User user) {
        user.setOtpHash(null);
        user.setOtpExpiresAt(null);
        user.setOtpLastSentAt(null);
        user.setOtpAttempts(0);
    }

    public static String normalizeEmail(String email) {
        return email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);
    }
}
