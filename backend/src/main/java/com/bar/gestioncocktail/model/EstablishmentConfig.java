package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Singleton entity storing legal establishment configuration (SIRET, TVA, RCS, address).
 */
@Data
@Entity
@Table(name = "establishment_config")
public class EstablishmentConfig {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @NotBlank(message = "The legal name is required")
    @Size(max = 255, message = "Legal name cannot exceed 255 characters")
    @Column(name = "legal_name", nullable = false)
    private String legalName = "OpenBar SARL";

    @Size(max = 50, message = "Legal form cannot exceed 50 characters")
    @Column(name = "legal_form")
    private String legalForm = "SARL";

    @Pattern(regexp = "^\\d{14}$", message = "SIRET must consist of exactly 14 digits")
    @Column(name = "siret", length = 14)
    private String siret = "12345678900010";

    @Size(max = 100, message = "RCS city cannot exceed 100 characters")
    @Column(name = "rcs_city")
    private String rcsCity = "Paris";

    @Size(max = 50, message = "RCS number cannot exceed 50 characters")
    @Column(name = "rcs_number")
    private String rcsNumber = "B 123 456 789";

    @Pattern(regexp = "^FR[0-9A-Z]{2}\\d{9}$", message = "Invalid French TVA number format (FRxx123456789)")
    @Column(name = "tva_number", length = 20)
    private String tvaNumber = "FR12123456789";

    @Pattern(regexp = "^\\d{4}[A-Z]$", message = "Invalid APE code format (e.g. 5630Z)")
    @Column(name = "code_ape", length = 10)
    private String codeApe = "5630Z";

    @Column(name = "capital_social", precision = 12, scale = 2)
    private BigDecimal capitalSocial = new BigDecimal("10000.00");

    @Size(max = 500, message = "Address cannot exceed 500 characters")
    @Column(name = "address")
    private String address = "12 Rue du Bar, 75001 Paris";

    @Size(max = 50, message = "Phone number cannot exceed 50 characters")
    @Column(name = "phone")
    private String phone = "+33123456789";

    @Size(max = 100, message = "Email cannot exceed 100 characters")
    @Column(name = "email")
    private String email = "contact@openbar.local";

    @Size(max = 255, message = "Payment terms cannot exceed 255 characters")
    @Column(name = "payment_terms")
    private String paymentTerms = "Paiement immédiat à réception";

    @Size(max = 255, message = "Discount policy cannot exceed 255 characters")
    @Column(name = "discount_policy")
    private String discountPolicy = "Aucun escompte pour paiement anticipé";

    @Column(name = "late_payment_rate", precision = 5, scale = 4)
    private BigDecimal latePaymentRate = new BigDecimal("0.1200");

    @Size(max = 50, message = "Time zone cannot exceed 50 characters")
    @Column(name = "time_zone", length = 50)
    private String timeZone = "SYSTEM";

    @Size(max = 10, message = "Ticket format cannot exceed 10 characters")
    @Pattern(regexp = "^(80mm|58mm)$", message = "Ticket format must be either 80mm or 58mm")
    @Column(name = "ticket_format", length = 10)
    private String ticketFormat = "80mm";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
