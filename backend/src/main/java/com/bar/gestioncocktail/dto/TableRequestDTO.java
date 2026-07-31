package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableEntity;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for creating or updating a table.
 *
 * @param numero      Table number (must be positive)
 * @param capacite    Seating capacity (must be at least 1)
 * @param zone        Table zone in the room layout
 * @param planX       Optional X position on floor plan
 * @param planY       Optional Y position on floor plan
 * @param planRotation Optional rotation angle on floor plan
 * @param planForme   Optional shape of the table (CARRE or ROND)
 */
public record TableRequestDTO(
    @NotNull(message = "Le numéro de table est obligatoire")
    @Min(value = 1, message = "Le numéro de table doit être supérieur ou égal à 1")
    Integer numero,

    @NotNull(message = "La capacité est obligatoire")
    @Min(value = 1, message = "La capacité doit être d'au moins 1 personne")
    Integer capacite,

    @jakarta.validation.constraints.NotBlank(message = "La zone est obligatoire")
    @jakarta.validation.constraints.Size(max = 50, message = "La zone ne peut pas dépasser 50 caractères")
    String zone,

    Double planX,
    Double planY,
    Double planRotation,
    String planForme
) {
    /**
     * Converts this DTO into a {@link TableEntity} JPA entity.
     *
     * @return A new {@link TableEntity} entity instance
     */
    public TableEntity toEntity() {
        TableEntity table = new TableEntity();
        table.setNumero(numero);
        table.setCapacite(capacite);
        table.setZone(zone);
        table.setPlanX(planX);
        table.setPlanY(planY);
        if (planRotation != null) {
            table.setPlanRotation(planRotation);
        }
        if (planForme != null) {
            table.setPlanForme(planForme);
        }
        return table;
    }
}
