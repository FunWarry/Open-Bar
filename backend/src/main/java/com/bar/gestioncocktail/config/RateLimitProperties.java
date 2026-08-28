package com.bar.gestioncocktail.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for OpenBar rate limiting policies.
 * <p>
 * Allows configuring rate limit policies per endpoint (e.g. login authentication).
 */
@ConfigurationProperties(prefix = "openbar.security.rate-limit")
public class RateLimitProperties {

    private Login login = new Login();

    /**
     * Retrieves the login rate limiting configuration.
     *
     * @return Login configuration
     */
    public Login getLogin() {
        return login;
    }

    /**
     * Sets the login rate limiting configuration.
     *
     * @param login Login configuration
     */
    public void setLogin(Login login) {
        this.login = login;
    }

    /**
     * Rate limit configuration settings for the login endpoint.
     */
    public static class Login {
        private boolean enabled = true;
        private String path = "/api/auth/login";
        private int capacity = 5;
        private int refillTokens = 1;
        private int refillDurationSeconds = 12;

        /**
         * Gets the endpoint path to rate limit.
         *
         * @return Endpoint path
         */
        public String getPath() {
            return path;
        }

        /**
         * Sets the endpoint path to rate limit.
         *
         * @param path Endpoint path
         */
        public void setPath(String path) {
            this.path = path;
        }

        /**
         * Checks if rate limiting on login is enabled.
         *
         * @return true if enabled, false otherwise
         */
        public boolean isEnabled() {
            return enabled;
        }

        /**
         * Sets whether rate limiting on login is enabled.
         *
         * @param enabled true to enable, false to disable
         */
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        /**
         * Gets the maximum burst capacity (number of tokens) in the bucket.
         *
         * @return Token bucket capacity
         */
        public int getCapacity() {
            return capacity;
        }

        /**
         * Sets the maximum burst capacity in the bucket.
         *
         * @param capacity Token bucket capacity
         */
        public void setCapacity(int capacity) {
            this.capacity = capacity;
        }

        /**
         * Gets the number of tokens refilled per interval.
         *
         * @return Number of refill tokens
         */
        public int getRefillTokens() {
            return refillTokens;
        }

        /**
         * Sets the number of tokens refilled per interval.
         *
         * @param refillTokens Number of refill tokens
         */
        public void setRefillTokens(int refillTokens) {
            this.refillTokens = refillTokens;
        }

        /**
         * Gets the refill interval duration in seconds.
         *
         * @return Duration in seconds
         */
        public int getRefillDurationSeconds() {
            return refillDurationSeconds;
        }

        /**
         * Sets the refill interval duration in seconds.
         *
         * @param refillDurationSeconds Duration in seconds
         */
        public void setRefillDurationSeconds(int refillDurationSeconds) {
            this.refillDurationSeconds = refillDurationSeconds;
        }
    }
}
