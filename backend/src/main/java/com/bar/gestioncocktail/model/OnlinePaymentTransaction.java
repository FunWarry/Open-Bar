package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity tracking online payment transactions executed by patrons at tables via mobile checkout
 * (Stripe Elements, Apple Pay, Google Pay, or Sandbox simulation mode).
 * Stores financial amounts, tips, idempotency keys, payment provider references, and audit links.
 */
@Data
@Entity
@Table(name = "online_payment_transactions")
public class OnlinePaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false, unique = true, length = 100)
    private String transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private TableEntity table;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facture_id")
    private Facture facture;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reglement_id")
    private FactureReglement reglement;

    @Column(name = "guest_name", length = 100)
    private String guestName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal tip = BigDecimal.ZERO;

    @Column(name = "total_charged", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCharged = BigDecimal.ZERO;

    @Column(nullable = false, length = 10)
    private String currency = "EUR";

    @Column(nullable = false, length = 50)
    private String provider = "STRIPE";

    @Column(nullable = false, length = 30)
    private String status = "PENDING";

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "payment_method_type", length = 50)
    private String paymentMethodType;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "client_secret")
    private String clientSecret;

    @Column(name = "items_json", columnDefinition = "TEXT")
    private String itemsJson;

    @Column(name = "type_split", nullable = false, length = 30)
    private String typeSplit = "TOTALITE";

    @Column(name = "liberate_table_requested")
    private Boolean liberateTableRequested = false;

    @Column(name = "receipt_url", length = 500)
    private String receiptUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }
}
