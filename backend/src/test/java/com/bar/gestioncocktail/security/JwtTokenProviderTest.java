package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test_jwt_secret_must_be_at_least_32_bytes_long_secret_key_12345");
        jwtProperties.setExpiration(3600000);
        jwtTokenProvider = new JwtTokenProvider(jwtProperties);
    }

    @Test
    void testGenerateTokenAndValidate() {
        String token = jwtTokenProvider.generateToken("admin");
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("admin", jwtTokenProvider.getUsernameFromJWT(token));
    }

    @Test
    void testGenerateTokenFromAuthenticationWithUserDetails() {
        UserDetails userDetails = new User("barman", "password", Collections.emptyList());
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, Collections.emptyList());

        String token = jwtTokenProvider.generateToken(auth);
        assertNotNull(token);
        assertEquals("barman", jwtTokenProvider.getUsernameFromJWT(token));
    }

    @Test
    void testGenerateTokenFromAuthenticationWithNameOnly() {
        Authentication auth = new UsernamePasswordAuthenticationToken("serveur", null, Collections.emptyList());

        String token = jwtTokenProvider.generateToken(auth);
        assertNotNull(token);
        assertEquals("serveur", jwtTokenProvider.getUsernameFromJWT(token));
    }

    @Test
    void testGenerateTokenNullAuthenticationThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> jwtTokenProvider.generateToken((Authentication) null));
    }

    @Test
    void testValidateTokenInvalid() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.here"));
    }
}
