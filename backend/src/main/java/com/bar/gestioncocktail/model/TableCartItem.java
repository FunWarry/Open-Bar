package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * JPA Entity representing an individual cocktail line added to a collaborative table cart by a guest.
 * <p>
 * Allows multiple patrons seated at the same physical table to collaboratively construct a shared cart
 * before dispatching the consolidated order to the bar.
 */
@Data
@Entity
@Table(name = "table_cart_items", indexes = {
        @Index(name = "idx_table_cart_items_table_id", columnList = "table_id"),
        @Index(name = "idx_table_cart_items_guest", columnList = "table_id, guest_session_id")
})
/**
 * JPA entity representing a drink item placed into a collaborative table cart before order validation.
 */
public class TableCartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Table ID is required")
    @Column(name = "table_id", nullable = false)
    private Long tableId;

    @NotBlank(message = "Guest session ID is required")
    @Size(max = 64, message = "Guest session ID cannot exceed 64 characters")
    @Column(name = "guest_session_id", nullable = false, length = 64)
    private String guestSessionId;

    @NotBlank(message = "Guest name is required")
    @Size(max = 100, message = "Guest name cannot exceed 100 characters")
    @Column(name = "guest_name", nullable = false, length = 100)
    private String guestName;

    @NotNull(message = "Cocktail ID is required")
    @Column(name = "cocktail_id", nullable = false)
    private Long cocktailId;

    @Column(name = "cocktail_variante_id")
    private Long cocktailVarianteId;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(name = "quantite", nullable = false)
    private int quantite = 1;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
