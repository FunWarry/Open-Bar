package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.model.TpeMonetizationTier;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for OpenBar's dual-tier TPE payment monetization engine.
 * Controls default tier rates (Option 1 Concert IP offline vs Option 3 Stripe Terminal Connect),
 * remote billing synchronization, grace period enforcement, and HMAC proof signing.
 */
@ConfigurationProperties(prefix = "openbar.monetization")
public class MonetizationProperties {

    /**
     * Default monetization tier when not overridden by a signed license JWT claim.
     */
    private TpeMonetizationTier defaultTier = TpeMonetizationTier.CONCERT_IP_OFFLINE;

    /**
     * Option 1 (Traditional Bank TPE via Concert IP) percentage rate in basis points (120 bps = 1.20%).
     */
    private int option1RateBps = 120;

    /**
     * Option 1 (Traditional Bank TPE via Concert IP) fixed fee per transaction in cents (10 = €0.10).
     */
    private int option1FixedCents = 10;

    /**
     * Option 3 (Turnkey Smart TPE via Stripe Terminal Connect) percentage rate in basis points (45 bps = 0.45%).
     */
    private int option3RateBps = 45;

    /**
     * Option 3 (Turnkey Smart TPE via Stripe Terminal Connect) fixed fee per transaction in cents (5 = €0.05).
     */
    private int option3FixedCents = 5;

    /**
     * Remote central billing & portal synchronization endpoint for Option 1 card volume receipts.
     */
    private String billingSyncUrl = "https://licensing.open-bar.eu/api/v1/monetization/sync";

    /**
     * Whether background automatic online commission ledger synchronization is enabled.
     */
    private boolean syncEnabled = false;

    /**
     * HTTP timeout in milliseconds for online commission synchronization calls.
     */
    private int syncTimeoutMs = 5000;

    /**
     * Number of grace days granted when a monthly commission invoice is pending before optional TPE lock.
     */
    private int gracePeriodDays = 7;

    /**
     * Whether overdue commission invoices lock new POS card/TPE transactions locally after grace expiration.
     */
    private boolean enforceGraceLock = false;

    /**
     * Optional HMAC-SHA256 secret used to authenticate offline monthly Z-report proof exports.
     */
    private String hmacSecret = "";

    /**
     * Platform Stripe Connect secret API key for Option 3 PayFac application-fee splits.
     */
    private String stripePlatformSecretKey = "";

    /**
     * Platform Stripe Connect webhook signing secret.
     */
    private String stripeConnectWebhookSecret = "";

    /**
     * Whether Option 3 falls back to a local Stripe Terminal simulator when Stripe API keys are absent.
     */
    private boolean stripeTerminalSimulatorFallback = true;

    public TpeMonetizationTier getDefaultTier() {
        return defaultTier;
    }

    public void setDefaultTier(TpeMonetizationTier defaultTier) {
        this.defaultTier = defaultTier != null ? defaultTier : TpeMonetizationTier.CONCERT_IP_OFFLINE;
    }

    public int getOption1RateBps() {
        return option1RateBps;
    }

    public void setOption1RateBps(int option1RateBps) {
        this.option1RateBps = Math.max(0, option1RateBps);
    }

    public int getOption1FixedCents() {
        return option1FixedCents;
    }

    public void setOption1FixedCents(int option1FixedCents) {
        this.option1FixedCents = Math.max(0, option1FixedCents);
    }

    public int getOption3RateBps() {
        return option3RateBps;
    }

    public void setOption3RateBps(int option3RateBps) {
        this.option3RateBps = Math.max(0, option3RateBps);
    }

    public int getOption3FixedCents() {
        return option3FixedCents;
    }

    public void setOption3FixedCents(int option3FixedCents) {
        this.option3FixedCents = Math.max(0, option3FixedCents);
    }

    public String getBillingSyncUrl() {
        return billingSyncUrl;
    }

    public void setBillingSyncUrl(String billingSyncUrl) {
        this.billingSyncUrl = billingSyncUrl;
    }

    public boolean isSyncEnabled() {
        return syncEnabled;
    }

    public void setSyncEnabled(boolean syncEnabled) {
        this.syncEnabled = syncEnabled;
    }

    public int getSyncTimeoutMs() {
        return syncTimeoutMs;
    }

    public void setSyncTimeoutMs(int syncTimeoutMs) {
        this.syncTimeoutMs = syncTimeoutMs;
    }

    public int getGracePeriodDays() {
        return gracePeriodDays;
    }

    public void setGracePeriodDays(int gracePeriodDays) {
        this.gracePeriodDays = Math.max(0, gracePeriodDays);
    }

    public boolean isEnforceGraceLock() {
        return enforceGraceLock;
    }

    public void setEnforceGraceLock(boolean enforceGraceLock) {
        this.enforceGraceLock = enforceGraceLock;
    }

    public String getHmacSecret() {
        return hmacSecret;
    }

    public void setHmacSecret(String hmacSecret) {
        this.hmacSecret = hmacSecret;
    }

    public String getStripePlatformSecretKey() {
        return stripePlatformSecretKey;
    }

    public void setStripePlatformSecretKey(String stripePlatformSecretKey) {
        this.stripePlatformSecretKey = stripePlatformSecretKey;
    }

    public String getStripeConnectWebhookSecret() {
        return stripeConnectWebhookSecret;
    }

    public void setStripeConnectWebhookSecret(String stripeConnectWebhookSecret) {
        this.stripeConnectWebhookSecret = stripeConnectWebhookSecret;
    }

    public boolean isStripeTerminalSimulatorFallback() {
        return stripeTerminalSimulatorFallback;
    }

    public void setStripeTerminalSimulatorFallback(boolean stripeTerminalSimulatorFallback) {
        this.stripeTerminalSimulatorFallback = stripeTerminalSimulatorFallback;
    }
}
