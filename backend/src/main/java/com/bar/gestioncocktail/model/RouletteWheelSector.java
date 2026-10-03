package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * JPA entity representing a sector/slice of the Cocktail Roulette Wheel.
 */
@Data
@Entity
@Table(name = "roulette_wheel_sectors")
public class RouletteWheelSector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Sector label is required")
    @Size(max = 100, message = "Label cannot exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String label;

    @NotNull(message = "Prize type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "prize_type", nullable = false, length = 30)
    private RoulettePrizeType prizeType = RoulettePrizeType.COCKTAIL;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cocktail_id")
    private Cocktail cocktail;

    @Size(max = 255, message = "Reward text cannot exceed 255 characters")
    @Column(name = "reward_text", length = 255)
    private String rewardText;

    @Column(precision = 10, scale = 2)
    private BigDecimal prix;

    @Size(max = 30, message = "Color cannot exceed 30 characters")
    @Column(name = "color_hex", length = 30)
    private String colorHex;

    @Size(max = 50, message = "Icon name cannot exceed 50 characters")
    @Column(name = "icon_name", length = 50)
    private String iconName;

    @Column(name = "probability_weight", nullable = false)
    private int probabilityWeight = 1;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
