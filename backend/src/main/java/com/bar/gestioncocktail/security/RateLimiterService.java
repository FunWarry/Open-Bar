package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.RateLimitProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing in-memory token bucket rate limiters per client IP address using Bucket4j.
 */
@Service
public class RateLimiterService {

    private final RateLimitProperties rateLimitProperties;
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    /**
     * Constructs the rate limiter service with configured properties.
     *
     * @param rateLimitProperties Configuration properties for rate limiting
     */
    public RateLimiterService(RateLimitProperties rateLimitProperties) {
        this.rateLimitProperties = rateLimitProperties;
    }

    /**
     * Evaluates whether a login attempt from a given client IP is allowed.
     *
     * @param clientIp Client IP address
     * @return Evaluation result containing allowance status and retry timing
     */
    public RateLimitResult tryConsumeLogin(String clientIp) {
        RateLimitProperties.Login loginConfig = rateLimitProperties.getLogin();
        if (!loginConfig.isEnabled()) {
            return new RateLimitResult(true, loginConfig.getCapacity(), 0);
        }

        String key = (clientIp != null && !clientIp.isBlank()) ? clientIp : "unknown";
        Bucket bucket = loginBuckets.computeIfAbsent(key, this::createLoginBucket);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        return new RateLimitResult(
                probe.isConsumed(),
                probe.getRemainingTokens(),
                probe.getNanosToWaitForRefill()
        );
    }

    /**
     * Clears all cached rate limit buckets.
     */
    public void reset() {
        loginBuckets.clear();
    }

    /**
     * Clears the rate limit bucket for a specific IP.
     *
     * @param clientIp Client IP address
     */
    public void reset(String clientIp) {
        if (clientIp != null) {
            loginBuckets.remove(clientIp);
        }
    }

    /**
     * Returns the number of currently tracked client IPs for login rate limiting.
     *
     * @return Number of active buckets
     */
    public int getActiveBucketsCount() {
        return loginBuckets.size();
    }

    private Bucket createLoginBucket(String key) {
        RateLimitProperties.Login config = rateLimitProperties.getLogin();
        Bandwidth limit = Bandwidth.builder()
                .capacity(config.getCapacity())
                .refillGreedy(config.getRefillTokens(), Duration.ofSeconds(config.getRefillDurationSeconds()))
                .build();

        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}
