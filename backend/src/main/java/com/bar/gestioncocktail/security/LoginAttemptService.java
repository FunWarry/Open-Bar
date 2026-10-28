package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.exception.BusinessException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force protection service tracking failed authentication and PIN verification attempts.
 * <p>
 * Temporarily locks out an identifier (username, IP, or PIN target) after a configurable number
 * of consecutive failures to prevent credential stuffing and 4-digit PIN enumeration attacks.
 */
@Service
public class LoginAttemptService {

    /**
     * Default maximum number of consecutive failed attempts before lockout.
     */
    public static final int DEFAULT_MAX_ATTEMPTS = 5;

    /**
     * Default lockout duration in seconds (15 minutes).
     */
    public static final long DEFAULT_LOCKOUT_SECONDS = 15 * 60L;

    private final int maxAttempts;
    private final long lockoutSeconds;
    private final Map<String, AttemptRecord> attempts = new ConcurrentHashMap<>();

    /**
     * Default constructor using standard brute-force thresholds (5 attempts, 15 minutes lockout).
     */
    public LoginAttemptService() {
        this(DEFAULT_MAX_ATTEMPTS, DEFAULT_LOCKOUT_SECONDS);
    }

    /**
     * Parameterized constructor for custom thresholds and testing.
     *
     * @param maxAttempts    Maximum consecutive failed attempts allowed
     * @param lockoutSeconds Lockout window duration in seconds
     */
    public LoginAttemptService(int maxAttempts, long lockoutSeconds) {
        this.maxAttempts = maxAttempts;
        this.lockoutSeconds = lockoutSeconds;
    }

    /**
     * Verifies that the given key is not currently locked out, throwing a {@link BusinessException} otherwise.
     *
     * @param key Identifier to check (e.g. "login:username" or "roulette-pin")
     */
    public void checkAllowed(String key) {
        if (isBlocked(key)) {
            throw new BusinessException("Too many failed attempts. Please try again later.");
        }
    }

    /**
     * Returns whether the given key is currently locked out due to excessive failed attempts.
     *
     * @param key Identifier to check
     * @return True if currently blocked, false otherwise
     */
    public boolean isBlocked(String key) {
        String normalizedKey = normalizeKey(key);
        AttemptRecord record = attempts.get(normalizedKey);
        if (record == null || record.lockedUntil == null) {
            return false;
        }
        if (Instant.now().isBefore(record.lockedUntil)) {
            return true;
        }
        attempts.remove(normalizedKey);
        return false;
    }

    /**
     * Records a failed authentication or PIN verification attempt for the given key.
     *
     * @param key Identifier that failed verification
     */
    public void recordFailure(String key) {
        String normalizedKey = normalizeKey(key);
        attempts.compute(normalizedKey, (_, existing) -> {
            Instant now = Instant.now();
            if (existing == null || (existing.lockedUntil != null && !now.isBefore(existing.lockedUntil))) {
                int count = 1;
                Instant lockedUntil = count >= maxAttempts ? now.plusSeconds(lockoutSeconds) : null;
                return new AttemptRecord(count, lockedUntil);
            }
            int nextCount = existing.failureCount + 1;
            Instant lockedUntil = nextCount >= maxAttempts ? now.plusSeconds(lockoutSeconds) : existing.lockedUntil;
            return new AttemptRecord(nextCount, lockedUntil);
        });
    }

    /**
     * Clears any recorded failed attempts for the given key following a successful verification.
     *
     * @param key Identifier that succeeded verification
     */
    public void recordSuccess(String key) {
        attempts.remove(normalizeKey(key));
    }

    /**
     * Clears all tracked attempt records.
     */
    public void resetAll() {
        attempts.clear();
    }

    private String normalizeKey(String key) {
        return key == null ? "anonymous" : key.trim().toLowerCase();
    }

    private record AttemptRecord(int failureCount, Instant lockedUntil) {
    }
}

