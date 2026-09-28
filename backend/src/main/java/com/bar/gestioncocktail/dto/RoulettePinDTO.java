package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO carrying the current or updated 4-digit PIN for staff display management.
 */
@Schema(description = "Staff TV display PIN payload")
public record RoulettePinDTO(
        @NotBlank(message = "PIN cannot be blank")
        @Pattern(regexp = "^\\d{4}$", message = "PIN must be exactly 4 digits")
        @Schema(description = "Current 4-digit PIN code", example = "7777")
        String pin
) {
}
