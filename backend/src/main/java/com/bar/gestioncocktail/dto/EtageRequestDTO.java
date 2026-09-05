package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.Min;
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
    @NotBlank(message = "Floor code is required")
    @Size(max = 50, message = "Code cannot exceed 50 characters")
    String code,

    @NotBlank(message = "Floor name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    String nom,

    @Min(value = 0, message = "Display order must be greater than or equal to 0")
    Integer ordre
) {}
