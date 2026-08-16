package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.RefreshToken;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("bartender");
        ReflectionTestUtils.setField(refreshTokenService, "refreshExpirationMs", 604800000L);
    }

    @Test
    @DisplayName("createRefreshToken - generates new token and deletes prior tokens")
    void createRefreshToken_success() {
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken token = refreshTokenService.createRefreshToken(user);

        assertThat(token).isNotNull();
        assertThat(token.getToken()).isNotBlank();
        assertThat(token.getUser()).isEqualTo(user);
        assertThat(token.getExpiryDate()).isAfter(Instant.now());
        verify(refreshTokenRepository).deleteByUser(user);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("findByToken - delegates to repository")
    void findByToken_delegates() {
        RefreshToken token = new RefreshToken();
        token.setToken("sample-token");
        when(refreshTokenRepository.findByToken("sample-token")).thenReturn(Optional.of(token));

        Optional<RefreshToken> result = refreshTokenService.findByToken("sample-token");

        assertThat(result).isPresent();
        assertThat(result.get().getToken()).isEqualTo("sample-token");
    }

    @Test
    @DisplayName("isExpired - returns true if expired, false otherwise")
    void isExpired_checksExpiration() {
        RefreshToken validToken = new RefreshToken();
        validToken.setExpiryDate(Instant.now().plus(1, ChronoUnit.HOURS));

        RefreshToken expiredToken = new RefreshToken();
        expiredToken.setExpiryDate(Instant.now().minus(1, ChronoUnit.HOURS));

        assertThat(refreshTokenService.isExpired(validToken)).isFalse();
        assertThat(refreshTokenService.isExpired(expiredToken)).isTrue();
    }

    @Test
    @DisplayName("deleteByUser - delegates to repository")
    void deleteByUser_delegates() {
        refreshTokenService.deleteByUser(user);
        verify(refreshTokenRepository).deleteByUser(user);
    }
}
