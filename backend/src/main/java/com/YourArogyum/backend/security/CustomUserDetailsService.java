
package com.YourArogyum.backend.security;

import com.YourArogyum.backend.entity.User;
import com.YourArogyum.backend.repository.UserRepository;
import com.YourArogyum.backend.service.EmailOtpService;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        User user = userRepository.findByEmail(
                EmailOtpService.normalizeEmail(email)
        ).orElseThrow(() ->
                new UsernameNotFoundException("User not found.")
        );

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash() == null
                        ? ""
                        : user.getPasswordHash())
                .roles("USER")
                .disabled(
                        "LOCAL".equals(user.getAuthProvider())
                                && !user.isEmailVerified()
                )
                .build();
    }
}
