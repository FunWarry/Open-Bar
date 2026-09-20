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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;

/**
 * Singleton entity storing legal establishment configuration (SIRET, TVA, RCS, address).
 */
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
    private String siret = "73282932000074";

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

    @Size(max = 100, message = "Country cannot exceed 100 characters")
    @Column(name = "country", length = 100)
    private String country = "France";

    @Size(max = 10, message = "Language cannot exceed 10 characters")
    @Column(name = "language", length = 10)
    private String language = "fr";

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

    @Column(name = "module_kitchen_kds_enabled")
    private Boolean moduleKitchenKdsEnabled = true;

    @Column(name = "module_happy_hour_enabled")
    private Boolean moduleHappyHourEnabled = true;

    @Column(name = "module_employee_management_enabled")
    private Boolean moduleEmployeeManagementEnabled = true;

    @Column(name = "module_floor_plan_enabled")
    private Boolean moduleFloorPlanEnabled = true;

    @Column(name = "module_qr_client_ordering_enabled")
    private Boolean moduleQrClientOrderingEnabled = true;

    @Column(name = "module_stock_tracking_enabled")
    private Boolean moduleStockTrackingEnabled = true;

    @Column(name = "module_cash_drawer_enabled")
    private Boolean moduleCashDrawerEnabled = true;

    @Column(name = "module_bar_tabs_enabled")
    private Boolean moduleBarTabsEnabled = true;

    @Column(name = "module_cocktail_library_enabled")
    private Boolean moduleCocktailLibraryEnabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EstablishmentConfig() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getLegalName() {
        return legalName;
    }

    public void setLegalName(String legalName) {
        this.legalName = legalName;
    }

    public String getLegalForm() {
        return legalForm;
    }

    public void setLegalForm(String legalForm) {
        this.legalForm = legalForm;
    }

    public String getSiret() {
        return siret;
    }

    public void setSiret(String siret) {
        this.siret = siret;
    }

    public String getRcsCity() {
        return rcsCity;
    }

    public void setRcsCity(String rcsCity) {
        this.rcsCity = rcsCity;
    }

    public String getRcsNumber() {
        return rcsNumber;
    }

    public void setRcsNumber(String rcsNumber) {
        this.rcsNumber = rcsNumber;
    }

    public String getTvaNumber() {
        return tvaNumber;
    }

    public void setTvaNumber(String tvaNumber) {
        this.tvaNumber = tvaNumber;
    }

    public String getCodeApe() {
        return codeApe;
    }

    public void setCodeApe(String codeApe) {
        this.codeApe = codeApe;
    }

    public BigDecimal getCapitalSocial() {
        return capitalSocial;
    }

    public void setCapitalSocial(BigDecimal capitalSocial) {
        this.capitalSocial = capitalSocial;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public String getDiscountPolicy() {
        return discountPolicy;
    }

    public void setDiscountPolicy(String discountPolicy) {
        this.discountPolicy = discountPolicy;
    }

    public BigDecimal getLatePaymentRate() {
        return latePaymentRate;
    }

    public void setLatePaymentRate(BigDecimal latePaymentRate) {
        this.latePaymentRate = latePaymentRate;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public String getTicketFormat() {
        return ticketFormat;
    }

    public void setTicketFormat(String ticketFormat) {
        this.ticketFormat = ticketFormat;
    }

    public Boolean getModuleKitchenKdsEnabled() {
        return moduleKitchenKdsEnabled;
    }

    public void setModuleKitchenKdsEnabled(Boolean moduleKitchenKdsEnabled) {
        this.moduleKitchenKdsEnabled = moduleKitchenKdsEnabled;
    }

    public Boolean getModuleHappyHourEnabled() {
        return moduleHappyHourEnabled;
    }

    public void setModuleHappyHourEnabled(Boolean moduleHappyHourEnabled) {
        this.moduleHappyHourEnabled = moduleHappyHourEnabled;
    }

    public Boolean getModuleEmployeeManagementEnabled() {
        return moduleEmployeeManagementEnabled;
    }

    public void setModuleEmployeeManagementEnabled(Boolean moduleEmployeeManagementEnabled) {
        this.moduleEmployeeManagementEnabled = moduleEmployeeManagementEnabled;
    }

    public Boolean getModuleFloorPlanEnabled() {
        return moduleFloorPlanEnabled;
    }

    public void setModuleFloorPlanEnabled(Boolean moduleFloorPlanEnabled) {
        this.moduleFloorPlanEnabled = moduleFloorPlanEnabled;
    }

    public Boolean getModuleQrClientOrderingEnabled() {
        return moduleQrClientOrderingEnabled;
    }

    public void setModuleQrClientOrderingEnabled(Boolean moduleQrClientOrderingEnabled) {
        this.moduleQrClientOrderingEnabled = moduleQrClientOrderingEnabled;
    }

    public Boolean getModuleStockTrackingEnabled() {
        return moduleStockTrackingEnabled;
    }

    public void setModuleStockTrackingEnabled(Boolean moduleStockTrackingEnabled) {
        this.moduleStockTrackingEnabled = moduleStockTrackingEnabled;
    }

    public Boolean getModuleCashDrawerEnabled() {
        return moduleCashDrawerEnabled;
    }

    public void setModuleCashDrawerEnabled(Boolean moduleCashDrawerEnabled) {
        this.moduleCashDrawerEnabled = moduleCashDrawerEnabled;
    }

    public Boolean getModuleBarTabsEnabled() {
        return moduleBarTabsEnabled;
    }

    public void setModuleBarTabsEnabled(Boolean moduleBarTabsEnabled) {
        this.moduleBarTabsEnabled = moduleBarTabsEnabled;
    }

    public Boolean getModuleCocktailLibraryEnabled() {
        return this.moduleCocktailLibraryEnabled;
    }

    public void setModuleCocktailLibraryEnabled(Boolean moduleCocktailLibraryEnabled) {
        this.moduleCocktailLibraryEnabled = moduleCocktailLibraryEnabled;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    /**
     * Checks whether a specific establishment module is currently active.
     *
     * @param module The module capability to check
     * @return True if enabled, false otherwise (defaults to true if null)
     */
    public boolean isModuleEnabled(EstablishmentModule module) {
        if (module == null) {
            return true;
        }
        switch (module) {
            case CUISINE_KDS:
                return Boolean.TRUE.equals(this.moduleKitchenKdsEnabled);
            case HAPPY_HOUR:
                return Boolean.TRUE.equals(this.moduleHappyHourEnabled);
            case EMPLOYEE_MANAGEMENT:
                return Boolean.TRUE.equals(this.moduleEmployeeManagementEnabled);
            case FLOOR_PLAN:
                return Boolean.TRUE.equals(this.moduleFloorPlanEnabled);
            case QR_CLIENT_ORDERING:
                return Boolean.TRUE.equals(this.moduleQrClientOrderingEnabled);
            case STOCK_TRACKING:
                return Boolean.TRUE.equals(this.moduleStockTrackingEnabled);
            case CASH_DRAWER:
                return Boolean.TRUE.equals(this.moduleCashDrawerEnabled);
            case BAR_TABS:
                return Boolean.TRUE.equals(this.moduleBarTabsEnabled);
            case COCKTAIL_LIBRARY:
                return Boolean.TRUE.equals(this.moduleCocktailLibraryEnabled);
            default:
                return true;
        }
    }

    /**
     * Sets the active status for a specific establishment capability module.
     *
     * @param module  The target module
     * @param enabled Desired status
     */
    public void setModuleEnabled(EstablishmentModule module, boolean enabled) {
        if (module == null) {
            return;
        }
        switch (module) {
            case CUISINE_KDS:
                this.moduleKitchenKdsEnabled = enabled;
                break;
            case HAPPY_HOUR:
                this.moduleHappyHourEnabled = enabled;
                break;
            case EMPLOYEE_MANAGEMENT:
                this.moduleEmployeeManagementEnabled = enabled;
                break;
            case FLOOR_PLAN:
                this.moduleFloorPlanEnabled = enabled;
                break;
            case QR_CLIENT_ORDERING:
                this.moduleQrClientOrderingEnabled = enabled;
                break;
            case STOCK_TRACKING:
                this.moduleStockTrackingEnabled = enabled;
                break;
            case CASH_DRAWER:
                this.moduleCashDrawerEnabled = enabled;
                break;
            case BAR_TABS:
                this.moduleBarTabsEnabled = enabled;
                break;
            case COCKTAIL_LIBRARY:
                this.moduleCocktailLibraryEnabled = enabled;
                break;
            default:
                break;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EstablishmentConfig that = (EstablishmentConfig) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "EstablishmentConfig{" +
                "id=" + id +
                ", legalName='" + legalName + '\'' +
                ", legalForm='" + legalForm + '\'' +
                ", siret='" + siret + '\'' +
                ", rcsCity='" + rcsCity + '\'' +
                ", rcsNumber='" + rcsNumber + '\'' +
                ", tvaNumber='" + tvaNumber + '\'' +
                ", codeApe='" + codeApe + '\'' +
                ", capitalSocial=" + capitalSocial +
                ", address='" + address + '\'' +
                ", country='" + country + '\'' +
                ", language='" + language + '\'' +
                ", phone='" + phone + '\'' +
                ", email='" + email + '\'' +
                ", paymentTerms='" + paymentTerms + '\'' +
                ", discountPolicy='" + discountPolicy + '\'' +
                ", latePaymentRate=" + latePaymentRate +
                ", timeZone='" + timeZone + '\'' +
                ", ticketFormat='" + ticketFormat + '\'' +
                ", moduleKitchenKdsEnabled=" + moduleKitchenKdsEnabled +
                ", moduleHappyHourEnabled=" + moduleHappyHourEnabled +
                ", moduleEmployeeManagementEnabled=" + moduleEmployeeManagementEnabled +
                ", moduleFloorPlanEnabled=" + moduleFloorPlanEnabled +
                ", moduleQrClientOrderingEnabled=" + moduleQrClientOrderingEnabled +
                ", moduleStockTrackingEnabled=" + moduleStockTrackingEnabled +
                ", moduleCashDrawerEnabled=" + moduleCashDrawerEnabled +
                ", moduleBarTabsEnabled=" + moduleBarTabsEnabled +
                ", moduleCocktailLibraryEnabled=" + moduleCocktailLibraryEnabled +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }

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
