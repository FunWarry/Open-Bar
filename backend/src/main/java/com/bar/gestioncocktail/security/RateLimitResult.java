package com.bar.gestioncocktail.security;

/**
 * Immutable record representing the evaluation outcome of a rate limit check.
 *
 * @param allowed              Whether the request is permitted by the rate limiter
 * @param remainingTokens      Number of remaining available tokens in the bucket
 * @param nanosToWaitForRefill Nanoseconds remaining before a token is refilled (if consumed was false)
 */
public record RateLimitResult(
        boolean allowed,
        long remainingTokens,
        long nanosToWaitForRefill
) {
    /**
     * Calculates the retry-after duration in full seconds.
     *
     * @return Number of seconds to wait before retrying (minimum 1 second)
     */
    public long getRetryAfterSeconds() {
        if (nanosToWaitForRefill <= 0) {
            return 0;
        }
        return Math.max(1, (nanosToWaitForRefill + 999_999_999L) / 1_000_000_000L);
    }
}
