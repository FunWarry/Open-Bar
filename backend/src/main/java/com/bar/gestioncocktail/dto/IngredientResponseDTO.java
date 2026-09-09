package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Allergen;
import com.bar.gestioncocktail.model.Ingredient;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * Response DTO describing an ingredient stock item.
 *
 * @param id             Unique identifier
 * @param nom            Ingredient name
 * @param uniteMesure    Unit of measurement
 * @param quantiteStock  Current stock quantity
 * @param seuilAlerte    Alert threshold
 * @param numeroLot      Lot number
 * @param datePeremption Expiry date
 * @param prixUnitaire   Unit purchase price in EUR
 * @param unitCost       Unit purchase cost in EUR (alias for prixUnitaire)
 * @param fournisseur    Supplier name
 * @param notes          Stock notes
 * @param allergens      Set of allergens contained in this ingredient
 * @param createdAt      Creation timestamp
 * @param updatedAt      Last update timestamp
 */
@Schema(description = "Ingredient stock entity response representation")
public record IngredientResponseDTO(
    Long id,
    String nom,
    String uniteMesure,
    BigDecimal quantiteStock,
    BigDecimal seuilAlerte,
    String numeroLot,
    LocalDateTime datePeremption,
    BigDecimal prixUnitaire,
    BigDecimal unitCost,
    String fournisseur,
    String notes,
    Set<Allergen> allergens,
    BigDecimal degreAlcool,
    Boolean isVegan,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Backward-compatible constructor without degreAlcool and isVegan.
     */
    public IngredientResponseDTO(
        Long id,
        String nom,
        String uniteMesure,
        BigDecimal quantiteStock,
        BigDecimal seuilAlerte,
        String numeroLot,
        LocalDateTime datePeremption,
        BigDecimal prixUnitaire,
        BigDecimal unitCost,
        String fournisseur,
        String notes,
        Set<Allergen> allergens,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, nom, uniteMesure, quantiteStock, seuilAlerte, numeroLot, datePeremption, prixUnitaire, unitCost, fournisseur, notes, allergens, BigDecimal.ZERO, true, createdAt, updatedAt);
    }

    /**
     * Backward-compatible constructor without allergens, degreAlcool and isVegan.
     */
    public IngredientResponseDTO(
        Long id,
        String nom,
        String uniteMesure,
        BigDecimal quantiteStock,
        BigDecimal seuilAlerte,
        String numeroLot,
        LocalDateTime datePeremption,
        BigDecimal prixUnitaire,
        BigDecimal unitCost,
        String fournisseur,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, nom, uniteMesure, quantiteStock, seuilAlerte, numeroLot, datePeremption, prixUnitaire, unitCost, fournisseur, notes, Set.of(), BigDecimal.ZERO, true, createdAt, updatedAt);
    }

    /**
     * Backward-compatible constructor without separate unitCost field, allergens, degreAlcool and isVegan.
     */
    public IngredientResponseDTO(
        Long id,
        String nom,
        String uniteMesure,
        BigDecimal quantiteStock,
        BigDecimal seuilAlerte,
        String numeroLot,
        LocalDateTime datePeremption,
        BigDecimal prixUnitaire,
        String fournisseur,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, nom, uniteMesure, quantiteStock, seuilAlerte, numeroLot, datePeremption, prixUnitaire, prixUnitaire, fournisseur, notes, Set.of(), BigDecimal.ZERO, true, createdAt, updatedAt);
    }

    /**
     * Maps an {@link Ingredient} entity to this response DTO.
     *
     * @param i source ingredient
     * @return response DTO
     */
    public static IngredientResponseDTO from(Ingredient i) {
        if (i == null) {
            return null;
        }
        Set<Allergen> allergens = i.getAllergens() != null ? i.getAllergens() : Set.of();
        return new IngredientResponseDTO(
            i.getId(), i.getNom(), i.getUniteMesure(), i.getQuantiteStock(),
            i.getSeuilAlerte(), i.getNumeroLot(), i.getDatePeremption(),
            i.getPrixUnitaire(), i.getPrixUnitaire(), i.getFournisseur(), i.getNotes(),
            allergens,
            i.getDegreAlcool() != null ? i.getDegreAlcool() : BigDecimal.ZERO,
            i.getIsVegan() == null || i.getIsVegan(),
            i.getCreatedAt(), i.getUpdatedAt()
        );
    }
}
