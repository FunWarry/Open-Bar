package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * Monthly commission billing state, invoice tracking, online sync telemetry,
 * and offline Z-report export proof record per billing period (YYYY-MM).
 */
@Entity
@Table(name = "commission_billing_records")
public class CommissionBillingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "billing_period", nullable = false, unique = true, length = 7)
    private String billingPeriod;

    @Column(name = "establishment_id", nullable = false, length = 100)
    private String establishmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "active_tier", nullable = false, length = 40)
    private TpeMonetizationTier activeTier = TpeMonetizationTier.CONCERT_IP_OFFLINE;

    @Column(name = "option1_volume", nullable = false, precision = 12, scale = 2)
    private BigDecimal option1Volume = BigDecimal.ZERO;

    @Column(name = "option1_count", nullable = false)
    private Long option1Count = 0L;

    @Column(name = "option1_commission", nullable = false, precision = 10, scale = 2)
    private BigDecimal option1Commission = BigDecimal.ZERO;

    @Column(name = "option3_volume", nullable = false, precision = 12, scale = 2)
    private BigDecimal option3Volume = BigDecimal.ZERO;

    @Column(name = "option3_count", nullable = false)
    private Long option3Count = 0L;

    @Column(name = "option3_commission", nullable = false, precision = 10, scale = 2)
    private BigDecimal option3Commission = BigDecimal.ZERO;

    @Column(name = "total_commission_due", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCommissionDue = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_status", nullable = false, length = 30)
    private CommissionInvoiceStatus invoiceStatus = CommissionInvoiceStatus.NONE;

    @Column(name = "remote_invoice_id", length = 120)
    private String remoteInvoiceId;

    @Column(name = "pending_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal pendingAmount = BigDecimal.ZERO;

    @Column(name = "grace_started_at")
    private Instant graceStartedAt;

    @Column(name = "grace_ends_at")
    private Instant graceEndsAt;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "last_sync_status", length = 30)
    private String lastSyncStatus = "NONE";

    @Column(name = "last_sync_error", length = 500)
    private String lastSyncError;

    @Column(name = "last_exported_at")
    private Instant lastExportedAt;

    @Column(name = "last_export_hash", length = 64)
    private String lastExportHash;

    @Column(name = "end_ledger_hash", length = 64)
    private String endLedgerHash;

    @Column(name = "z_report_refs_json", columnDefinition = "TEXT")
    private String zReportRefsJson;

    @Column(name = "settled_at")
    private Instant settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBillingPeriod() {
        return billingPeriod;
    }

    public void setBillingPeriod(String billingPeriod) {
        this.billingPeriod = billingPeriod;
    }

    public String getEstablishmentId() {
        return establishmentId;
    }

    public void setEstablishmentId(String establishmentId) {
        this.establishmentId = establishmentId;
    }

    public TpeMonetizationTier getActiveTier() {
        return activeTier;
    }

    public void setActiveTier(TpeMonetizationTier activeTier) {
        this.activeTier = activeTier;
    }

    public BigDecimal getOption1Volume() {
        return option1Volume;
    }

    public void setOption1Volume(BigDecimal option1Volume) {
        this.option1Volume = option1Volume;
    }

    public Long getOption1Count() {
        return option1Count;
    }

    public void setOption1Count(Long option1Count) {
        this.option1Count = option1Count;
    }

    public BigDecimal getOption1Commission() {
        return option1Commission;
    }

    public void setOption1Commission(BigDecimal option1Commission) {
        this.option1Commission = option1Commission;
    }

    public BigDecimal getOption3Volume() {
        return option3Volume;
    }

    public void setOption3Volume(BigDecimal option3Volume) {
        this.option3Volume = option3Volume;
    }

    public Long getOption3Count() {
        return option3Count;
    }

    public void setOption3Count(Long option3Count) {
        this.option3Count = option3Count;
    }

    public BigDecimal getOption3Commission() {
        return option3Commission;
    }

    public void setOption3Commission(BigDecimal option3Commission) {
        this.option3Commission = option3Commission;
    }

    public BigDecimal getTotalCommissionDue() {
        return totalCommissionDue;
    }

    public void setTotalCommissionDue(BigDecimal totalCommissionDue) {
        this.totalCommissionDue = totalCommissionDue;
    }

    public CommissionInvoiceStatus getInvoiceStatus() {
        return invoiceStatus;
    }

    public void setInvoiceStatus(CommissionInvoiceStatus invoiceStatus) {
        this.invoiceStatus = invoiceStatus;
    }

    public String getRemoteInvoiceId() {
        return remoteInvoiceId;
    }

    public void setRemoteInvoiceId(String remoteInvoiceId) {
        this.remoteInvoiceId = remoteInvoiceId;
    }

    public BigDecimal getPendingAmount() {
        return pendingAmount;
    }

    public void setPendingAmount(BigDecimal pendingAmount) {
        this.pendingAmount = pendingAmount;
    }

    public Instant getGraceStartedAt() {
        return graceStartedAt;
    }

    public void setGraceStartedAt(Instant graceStartedAt) {
        this.graceStartedAt = graceStartedAt;
    }

    public Instant getGraceEndsAt() {
        return graceEndsAt;
    }

    public void setGraceEndsAt(Instant graceEndsAt) {
        this.graceEndsAt = graceEndsAt;
    }

    public Instant getLastSyncAt() {
        return lastSyncAt;
    }

    public void setLastSyncAt(Instant lastSyncAt) {
        this.lastSyncAt = lastSyncAt;
    }

    public String getLastSyncStatus() {
        return lastSyncStatus;
    }

    public void setLastSyncStatus(String lastSyncStatus) {
        this.lastSyncStatus = lastSyncStatus;
    }

    public String getLastSyncError() {
        return lastSyncError;
    }

    public void setLastSyncError(String lastSyncError) {
        this.lastSyncError = lastSyncError;
    }

    public Instant getLastExportedAt() {
        return lastExportedAt;
    }

    public void setLastExportedAt(Instant lastExportedAt) {
        this.lastExportedAt = lastExportedAt;
    }

    public String getLastExportHash() {
        return lastExportHash;
    }

    public void setLastExportHash(String lastExportHash) {
        this.lastExportHash = lastExportHash;
    }

    public String getEndLedgerHash() {
        return endLedgerHash;
    }

    public void setEndLedgerHash(String endLedgerHash) {
        this.endLedgerHash = endLedgerHash;
    }

    public String getZReportRefsJson() {
        return zReportRefsJson;
    }

    public void setZReportRefsJson(String zReportRefsJson) {
        this.zReportRefsJson = zReportRefsJson;
    }

    public Instant getSettledAt() {
        return settledAt;
    }

    public void setSettledAt(Instant settledAt) {
        this.settledAt = settledAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CommissionBillingRecord that)) return false;
        return Objects.equals(id, that.id) && Objects.equals(billingPeriod, that.billingPeriod);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, billingPeriod);
    }
}
