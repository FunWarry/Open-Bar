package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Data transfer object for floor creation and update requests.
 *
 * @param code unique floor code identifier
 * @param nom human readable label of the floor
 * @param ordre sorting order index
 */
public record EtageRequestDTO(
    @NotBlank(message = "Le code de l'étage est obligatoire")
    @Size(max = 50, message = "Le code ne peut pas dépasser 50 caractères")
    String code,

    @NotBlank(message = "Le nom de l'étage est obligatoire")
    @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
    String nom,

    Integer ordre
) {}
