package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.RefreshToken;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

/**
 * Service managing JWT refresh token lifecycle, persistence, and expiration validation.
 */
@Service
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration-ms:604800000}") // 7 days by default
    private long refreshExpirationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final TimeService timeService;

    /**
     * Constructs RefreshTokenService with required repositories and time service.
     *
     * @param refreshTokenRepository Repository for refresh token persistence
     * @param timeService            Service providing consistent application time
     */
    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, TimeService timeService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.timeService = timeService;
    }

    /**
     * Creates and persists a new unique refresh token for the specified user, revoking any previous tokens.
     *
     * @param user The user entity for whom the refresh token is generated
     * @return The persisted {@link RefreshToken} entity
     */
    @Transactional
    public RefreshToken createRefreshToken(User user) {
        refreshTokenRepository.deleteByUser(user);
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken(UUID.randomUUID().toString());
        token.setExpiryDate(timeService.nowInstant().plusMillis(refreshExpirationMs));
        return refreshTokenRepository.save(token);
    }

    /**
     * Retrieves a refresh token by its string representation.
     *
     * @param token The token string to look up
     * @return An {@link Optional} containing the {@link RefreshToken} if found
     */
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    /**
     * Determines whether the given refresh token has expired based on current application time.
     *
     * @param token The token to check
     * @return {@code true} if the token is past its expiry date, {@code false} otherwise
     */
    public boolean isExpired(RefreshToken token) {
        return token.getExpiryDate().isBefore(timeService.nowInstant());
    }

    /**
     * Deletes all refresh tokens associated with the given user.
     *
     * @param user The user whose refresh tokens should be deleted
     */
    @Transactional
    public void deleteByUser(User user) {
        refreshTokenRepository.deleteByUser(user);
    }
}
