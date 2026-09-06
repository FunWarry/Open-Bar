package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing an official end-of-day register closing report (Z-Report / Clôture de caisse).
 * Records physical cash counting, discrepancies, financial totals, VAT distribution,
 * payment method breakdown, and a cryptographic SHA-256 seal for tamper detection.
 */
@Data
@Entity
@Table(name = "daily_cash_closures")
public class DailyCashClosure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "closure_number", nullable = false, unique = true, length = 50)
    private String closureNumber;

    @Column(name = "closure_date", nullable = false, unique = true)
    private LocalDate closureDate;

    @Column(name = "opening_float", nullable = false, precision = 10, scale = 2)
    private BigDecimal openingFloat = BigDecimal.ZERO;

    @Column(name = "theoretical_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal theoreticalCash = BigDecimal.ZERO;

    @Column(name = "counted_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal countedCash = BigDecimal.ZERO;

    @Column(name = "cash_discrepancy", nullable = false, precision = 10, scale = 2)
    private BigDecimal cashDiscrepancy = BigDecimal.ZERO;

    @Column(name = "total_revenue_ht", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalRevenueHT = BigDecimal.ZERO;

    @Column(name = "total_revenue_ttc", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalRevenueTTC = BigDecimal.ZERO;

    @Column(name = "vat_breakdown_json", columnDefinition = "TEXT")
    private String vatBreakdownJson;

    @Column(name = "payment_methods_json", columnDefinition = "TEXT")
    private String paymentMethodsJson;

    @Column(name = "counting_breakdown_json", columnDefinition = "TEXT")
    private String countingBreakdownJson;

    @Column(name = "discrepancy_reason", columnDefinition = "TEXT")
    private String discrepancyReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by_id")
    private User closedBy;

    @Column(name = "sha256_hash", nullable = false, length = 64)
    private String sha256Hash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Initializes timestamps prior to entity persistence.
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    /**
     * Updates timestamps prior to entity updates.
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }
}
