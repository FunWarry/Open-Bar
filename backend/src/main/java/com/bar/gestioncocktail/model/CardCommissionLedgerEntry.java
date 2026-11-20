package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * Immutable hash-chained ledger entry recording a card payment volume and computed platform commission.
 * Forms a tamper-evident SHA-256 chain aligned with NF525 audit requirements.
 */
@Entity
@Table(name = "card_commission_ledger")
public class CardCommissionLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sequence_number", nullable = false, unique = true)
    private Long sequenceNumber;

    @Column(name = "billing_period", nullable = false, length = 7)
    private String billingPeriod;

    @Column(name = "establishment_id", nullable = false, length = 100)
    private String establishmentId;

    @Column(name = "facture_id")
    private Long factureId;

    @Column(name = "reglement_id")
    private Long reglementId;

    @Column(name = "invoice_number", length = 60)
    private String invoiceNumber;

    @Column(name = "external_transaction_id", length = 120)
    private String externalTransactionId;

    @Column(name = "tpe_authorization_code", length = 80)
    private String tpeAuthorizationCode;

    @Column(name = "tpe_terminal_id", length = 80)
    private String tpeTerminalId;

    @Column(name = "card_brand", length = 50)
    private String cardBrand;

    @Column(name = "masked_pan", length = 50)
    private String maskedPan;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, length = 40)
    private TpeMonetizationTier tier;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 40)
    private CardCommissionSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private CardCommissionStatus status;

    @Column(name = "gross_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal grossAmount = BigDecimal.ZERO;

    @Column(name = "rate_bps", nullable = false)
    private Integer rateBps = 0;

    @Column(name = "fixed_fee_cents", nullable = false)
    private Integer fixedFeeCents = 0;

    @Column(name = "commission_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "EUR";

    @Column(name = "previous_hash", nullable = false, length = 64)
    private String previousHash;

    @Column(name = "entry_hash", nullable = false, length = 64, unique = true)
    private String entryHash;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    @Column(name = "synced_at")
    private Instant syncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (this.recordedAt == null) {
            this.recordedAt = now;
        }
        if (this.createdAt == null) {
            this.createdAt = now;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(Long sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
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

    public Long getFactureId() {
        return factureId;
    }

    public void setFactureId(Long factureId) {
        this.factureId = factureId;
    }

    public Long getReglementId() {
        return reglementId;
    }

    public void setReglementId(Long reglementId) {
        this.reglementId = reglementId;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getExternalTransactionId() {
        return externalTransactionId;
    }

    public void setExternalTransactionId(String externalTransactionId) {
        this.externalTransactionId = externalTransactionId;
    }

    public String getTpeAuthorizationCode() {
        return tpeAuthorizationCode;
    }

    public void setTpeAuthorizationCode(String tpeAuthorizationCode) {
        this.tpeAuthorizationCode = tpeAuthorizationCode;
    }

    public String getTpeTerminalId() {
        return tpeTerminalId;
    }

    public void setTpeTerminalId(String tpeTerminalId) {
        this.tpeTerminalId = tpeTerminalId;
    }

    public String getCardBrand() {
        return cardBrand;
    }

    public void setCardBrand(String cardBrand) {
        this.cardBrand = cardBrand;
    }

    public String getMaskedPan() {
        return maskedPan;
    }

    public void setMaskedPan(String maskedPan) {
        this.maskedPan = maskedPan;
    }

    public TpeMonetizationTier getTier() {
        return tier;
    }

    public void setTier(TpeMonetizationTier tier) {
        this.tier = tier;
    }

    public CardCommissionSource getSource() {
        return source;
    }

    public void setSource(CardCommissionSource source) {
        this.source = source;
    }

    public CardCommissionStatus getStatus() {
        return status;
    }

    public void setStatus(CardCommissionStatus status) {
        this.status = status;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(BigDecimal grossAmount) {
        this.grossAmount = grossAmount;
    }

    public Integer getRateBps() {
        return rateBps;
    }

    public void setRateBps(Integer rateBps) {
        this.rateBps = rateBps;
    }

    public Integer getFixedFeeCents() {
        return fixedFeeCents;
    }

    public void setFixedFeeCents(Integer fixedFeeCents) {
        this.fixedFeeCents = fixedFeeCents;
    }

    public BigDecimal getCommissionAmount() {
        return commissionAmount;
    }

    public void setCommissionAmount(BigDecimal commissionAmount) {
        this.commissionAmount = commissionAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPreviousHash() {
        return previousHash;
    }

    public void setPreviousHash(String previousHash) {
        this.previousHash = previousHash;
    }

    public String getEntryHash() {
        return entryHash;
    }

    public void setEntryHash(String entryHash) {
        this.entryHash = entryHash;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }

    public Instant getSyncedAt() {
        return syncedAt;
    }

    public void setSyncedAt(Instant syncedAt) {
        this.syncedAt = syncedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CardCommissionLedgerEntry that)) return false;
        return Objects.equals(id, that.id) && Objects.equals(sequenceNumber, that.sequenceNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, sequenceNumber);
    }
}
