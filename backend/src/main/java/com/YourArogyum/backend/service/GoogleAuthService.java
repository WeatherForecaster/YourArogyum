
package com.YourArogyum.backend.service;

import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.UserRepository;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;

@Service
public class GoogleAuthService {

    private final UserRepository userRepository;

    @Value("${app.google.client-id}")
    private String googleClientId;

    public GoogleAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User loginWithGoogle(String credential) {
        try {
            GoogleIdTokenVerifier verifier =
                    new GoogleIdTokenVerifier.Builder(
                            new NetHttpTransport(),
                            GsonFactory.getDefaultInstance()
                    )
                            .setAudience(Collections.singletonList(googleClientId))
                            .build();

            GoogleIdToken token = verifier.verify(credential);

            if (token == null) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid Google sign-in token."
                );
            }

            GoogleIdToken.Payload payload = token.getPayload();

            String googleId = payload.getSubject();
            String email =
                    EmailOtpService.normalizeEmail(payload.getEmail());

            Object verifiedClaim = payload.get("email_verified");
            boolean googleEmailVerified =
                    Boolean.TRUE.equals(verifiedClaim);

            if (googleId == null
                    || email.isBlank()
                    || !googleEmailVerified) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Google did not provide a verified email."
                );
            }

            String name = (String) payload.get("name");

            // First, look for an existing account linked to this Google ID.
            User user = userRepository.findByGoogleId(googleId)
                    .orElse(null);

            if (user != null) {
                if (!email.equals(
                        EmailOtpService.normalizeEmail(user.getEmail()))) {
                    throw new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "Google account details did not match."
                    );
                }

                return user;
            }

            // Avoid creating a duplicate if this email belongs to
            // an existing local account.
            User existing = userRepository.findByEmail(email)
                    .orElse(null);

            if (existing != null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "An account already exists for this email. "
                                + "Please sign in using your existing method."
                );
            }

            // Create a new account for a first-time Google sign-in.
            User created = new User();

            created.setName(
                    name == null || name.isBlank()
                            ? email.substring(0, email.indexOf('@'))
                            : name.trim()
            );

            created.setEmail(email);
            created.setAuthProvider("GOOGLE");
            created.setGoogleId(googleId);
            created.setEmailVerified(true);
            created.setPasswordHash(null);

            return userRepository.save(created);

        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Google sign-in could not be verified."
            );
        }
    }
}
