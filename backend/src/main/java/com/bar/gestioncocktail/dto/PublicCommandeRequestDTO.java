package com.bar.gestioncocktail.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublicCommandeRequestDTO {
    @NotNull(message = "La table est obligatoire")
    private Long tableId;

    @NotEmpty(message = "La liste des articles ne peut pas être vide")
    @Valid
    private List<PublicCommandeItemRequestDTO> items;

    private String notes;
}
