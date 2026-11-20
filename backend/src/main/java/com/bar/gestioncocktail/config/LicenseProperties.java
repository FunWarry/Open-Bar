package com.bar.gestioncocktail.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for OpenBar's hybrid offline/online DRM licensing engine.
 * Controls cryptographic public keys, enforcement mode, grace period duration, and online sync settings.
 */
@ConfigurationProperties(prefix = "openbar.licensing")
public class LicenseProperties {

    private static final String DEFAULT_EC_PUBLIC_KEY_PEM = """
            -----BEGIN PUBLIC KEY-----
            MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEzboZnPgnrep0ncMA0C0fV+QxcVdQ
            DHpPubg2C984w4g8eT8tpAetXJjyT7TnUl/LsfXe50jWutuQq0wqtoaSTA==
            -----END PUBLIC KEY-----""";

    /**
     * Whether strict commercial license enforcement locks order creation when unlicensed or expired.
     * Defaults to false in dev/test profiles and true in production deployments.
     */
    private boolean enforced = false;

    /**
     * Embedded X.509 SPKI PEM public key for ECDSA (ES256/ES384/ES512) or RSA verification.
     */
    private String publicKeyPem = DEFAULT_EC_PUBLIC_KEY_PEM;

    /**
     * Optional secondary X.509 SPKI PEM RSA public key when supporting both ECDSA and RSA keys simultaneously.
     */
    private String rsaPublicKeyPem = "";

    /**
     * Number of grace days granted after license expiration before order creation is locked.
     */
    private int gracePeriodDays = 2;

    /**
     * Whether background automatic online license synchronization is enabled.
     */
    private boolean syncEnabled = false;

    /**
     * Remote licensing authority endpoint used for automatic online token refresh.
     */
    private String syncUrl = "https://licensing.open-bar.eu/api/v1/licenses/sync";

    /**
     * Interval in milliseconds between automatic background license sync attempts (default 6 hours).
     */
    private long syncIntervalMs = 21600000L;

    /**
     * HTTP timeout in milliseconds for online license synchronization calls.
     */
    private int syncTimeoutMs = 5000;

    /**
     * Returns whether license enforcement locks order intake when expired or unlicensed.
     *
     * @return true if license enforcement is active
     */
    public boolean isEnforced() {
        return enforced;
    }

    /**
     * Sets whether license enforcement locks order intake when expired or unlicensed.
     *
     * @param enforced enforcement flag
     */
    public void setEnforced(boolean enforced) {
        this.enforced = enforced;
    }

    /**
     * Returns the primary X.509 PEM public key used for license signature verification.
     *
     * @return PEM encoded public key
     */
    public String getPublicKeyPem() {
        return publicKeyPem;
    }

    /**
     * Sets the primary X.509 PEM public key used for license signature verification.
     *
     * @param publicKeyPem PEM encoded public key
     */
    public void setPublicKeyPem(String publicKeyPem) {
        this.publicKeyPem = publicKeyPem;
    }

    /**
     * Returns the optional secondary RSA X.509 PEM public key.
     *
     * @return PEM encoded RSA public key
     */
    public String getRsaPublicKeyPem() {
        return rsaPublicKeyPem;
    }

    /**
     * Sets the optional secondary RSA X.509 PEM public key.
     *
     * @param rsaPublicKeyPem PEM encoded RSA public key
     */
    public void setRsaPublicKeyPem(String rsaPublicKeyPem) {
        this.rsaPublicKeyPem = rsaPublicKeyPem;
    }

    /**
     * Returns the number of days in the post-expiration order-taking grace period.
     *
     * @return grace period in days
     */
    public int getGracePeriodDays() {
        return gracePeriodDays;
    }

    /**
     * Sets the number of days in the post-expiration order-taking grace period.
     *
     * @param gracePeriodDays grace period in days
     */
    public void setGracePeriodDays(int gracePeriodDays) {
        this.gracePeriodDays = gracePeriodDays;
    }

    /**
     * Returns whether automatic background license synchronization is enabled.
     *
     * @return true if scheduled background sync is active
     */
    public boolean isSyncEnabled() {
        return syncEnabled;
    }

    /**
     * Sets whether automatic background license synchronization is enabled.
     *
     * @param syncEnabled background sync flag
     */
    public void setSyncEnabled(boolean syncEnabled) {
        this.syncEnabled = syncEnabled;
    }

    /**
     * Returns the remote license synchronization endpoint URL.
     *
     * @return sync endpoint URL
     */
    public String getSyncUrl() {
        return syncUrl;
    }

    /**
     * Sets the remote license synchronization endpoint URL.
     *
     * @param syncUrl sync endpoint URL
     */
    public void setSyncUrl(String syncUrl) {
        this.syncUrl = syncUrl;
    }

    /**
     * Returns the interval in milliseconds between background sync checks.
     *
     * @return interval in milliseconds
     */
    public long getSyncIntervalMs() {
        return syncIntervalMs;
    }

    /**
     * Sets the interval in milliseconds between background sync checks.
     *
     * @param syncIntervalMs interval in milliseconds
     */
    public void setSyncIntervalMs(long syncIntervalMs) {
        this.syncIntervalMs = syncIntervalMs;
    }

    /**
     * Returns the HTTP connection/request timeout in milliseconds for online license sync.
     *
     * @return timeout in milliseconds
     */
    public int getSyncTimeoutMs() {
        return syncTimeoutMs;
    }

    /**
     * Sets the HTTP connection/request timeout in milliseconds for online license sync.
     *
     * @param syncTimeoutMs timeout in milliseconds
     */
    public void setSyncTimeoutMs(int syncTimeoutMs) {
        this.syncTimeoutMs = syncTimeoutMs;
    }
}
