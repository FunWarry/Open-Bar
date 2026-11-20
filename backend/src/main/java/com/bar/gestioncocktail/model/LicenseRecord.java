package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

/**
 * Singleton JPA entity persisting the venue's signed JWT license token,
 * parsed entitlement metadata, clock high-water mark, and online sync telemetry.
 */
@Entity
@Table(name = "license_records")
public class LicenseRecord {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(name = "license_token", columnDefinition = "TEXT")
    private String licenseToken;

    @Column(name = "establishment_id", length = 100)
    private String establishmentId;

    @Column(name = "plan", length = 50)
    private String plan;

    @Column(name = "licensed_modules_json", columnDefinition = "TEXT")
    private String licensedModulesJson;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "last_sync_status", length = 30)
    private String lastSyncStatus = "NONE";

    @Column(name = "last_sync_error", length = 500)
    private String lastSyncError;

    @Column(name = "activation_mode", length = 30)
    private String activationMode = "NONE";

    @Column(name = "activated_by", length = 100)
    private String activatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Returns the singleton primary key identifier.
     *
     * @return record identifier
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the singleton primary key identifier.
     *
     * @param id record identifier
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Returns the raw signed JWT license token string.
     *
     * @return JWT token or null if unlicensed
     */
    public String getLicenseToken() {
        return licenseToken;
    }

    /**
     * Sets the raw signed JWT license token string.
     *
     * @param licenseToken JWT token
     */
    public void setLicenseToken(String licenseToken) {
        this.licenseToken = licenseToken;
    }

    /**
     * Returns the establishment identifier bound inside the license payload.
     *
     * @return establishment ID or wildcard
     */
    public String getEstablishmentId() {
        return establishmentId;
    }

    /**
     * Sets the establishment identifier bound inside the license payload.
     *
     * @param establishmentId establishment ID
     */
    public void setEstablishmentId(String establishmentId) {
        this.establishmentId = establishmentId;
    }

    /**
     * Returns the subscription plan tier name.
     *
     * @return subscription plan
     */
    public String getPlan() {
        return plan;
    }

    /**
     * Sets the subscription plan tier name.
     *
     * @param plan subscription plan
     */
    public void setPlan(String plan) {
        this.plan = plan;
    }

    /**
     * Returns the JSON-serialized list of licensed module identifiers.
     *
     * @return JSON array string
     */
    public String getLicensedModulesJson() {
        return licensedModulesJson;
    }

    /**
     * Sets the JSON-serialized list of licensed module identifiers.
     *
     * @param licensedModulesJson JSON array string
     */
    public void setLicensedModulesJson(String licensedModulesJson) {
        this.licensedModulesJson = licensedModulesJson;
    }

    /**
     * Returns the UTC instant when the license token was issued.
     *
     * @return issued timestamp
     */
    public Instant getIssuedAt() {
        return issuedAt;
    }

    /**
     * Sets the UTC instant when the license token was issued.
     *
     * @param issuedAt issued timestamp
     */
    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    /**
     * Returns the UTC instant when the subscription period expires.
     *
     * @return expiration timestamp
     */
    public Instant getExpiresAt() {
        return expiresAt;
    }

    /**
     * Sets the UTC instant when the subscription period expires.
     *
     * @param expiresAt expiration timestamp
     */
    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    /**
     * Returns the monotonic high-water mark UTC instant observed by the system.
     *
     * @return last seen UTC instant
     */
    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    /**
     * Sets the monotonic high-water mark UTC instant observed by the system.
     *
     * @param lastSeenAt last seen UTC instant
     */
    public void setLastSeenAt(Instant lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
    }

    /**
     * Returns the UTC instant of the last online license sync attempt.
     *
     * @return last sync UTC instant
     */
    public Instant getLastSyncAt() {
        return lastSyncAt;
    }

    /**
     * Sets the UTC instant of the last online license sync attempt.
     *
     * @param lastSyncAt last sync UTC instant
     */
    public void setLastSyncAt(Instant lastSyncAt) {
        this.lastSyncAt = lastSyncAt;
    }

    /**
     * Returns the status of the last online sync attempt (SUCCESS, OFFLINE, FAILED, NONE).
     *
     * @return last sync status
     */
    public String getLastSyncStatus() {
        return lastSyncStatus;
    }

    /**
     * Sets the status of the last online sync attempt.
     *
     * @param lastSyncStatus last sync status
     */
    public void setLastSyncStatus(String lastSyncStatus) {
        this.lastSyncStatus = lastSyncStatus;
    }

    /**
     * Returns the error summary from the most recent failed sync attempt.
     *
     * @return last sync error message or null
     */
    public String getLastSyncError() {
        return lastSyncError;
    }

    /**
     * Sets the error summary from the most recent failed sync attempt.
     *
     * @param lastSyncError last sync error message
     */
    public void setLastSyncError(String lastSyncError) {
        this.lastSyncError = lastSyncError;
    }

    /**
     * Returns how the current license was activated (ONLINE, OFFLINE, SEEDED, NONE).
     *
     * @return activation mode
     */
    public String getActivationMode() {
        return activationMode;
    }

    /**
     * Sets how the current license was activated.
     *
     * @param activationMode activation mode
     */
    public void setActivationMode(String activationMode) {
        this.activationMode = activationMode;
    }

    /**
     * Returns the username or actor that activated the license.
     *
     * @return activating username
     */
    public String getActivatedBy() {
        return activatedBy;
    }

    /**
     * Sets the username or actor that activated the license.
     *
     * @param activatedBy activating username
     */
    public void setActivatedBy(String activatedBy) {
        this.activatedBy = activatedBy;
    }

    /**
     * Returns the UTC creation timestamp of this record.
     *
     * @return creation timestamp
     */
    public Instant getCreatedAt() {
        return createdAt;
    }

    /**
     * Returns the UTC last modification timestamp of this record.
     *
     * @return update timestamp
     */
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        LicenseRecord that = (LicenseRecord) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
