package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublicCommandeItemRequestDTO {
    @NotNull(message = "Le cocktail est obligatoire")
    private Long cocktailId;

    private Long varianteId;

    @Min(value = 1, message = "La quantité doit être d'au moins 1")
    private int quantite = 1;

    private String notes;
}
