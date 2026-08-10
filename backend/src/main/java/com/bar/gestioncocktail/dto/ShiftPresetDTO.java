package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ShiftPreset;
import com.bar.gestioncocktail.model.TypeShift;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Data Transfer Object (record) representing a shift template preset.
 */
public record ShiftPresetDTO(
    Long id,

    @NotNull(message = "typeShift is required")
    TypeShift typeShift,

    @NotBlank(message = "nom is required")
    String nom,

    @NotBlank(message = "heureDebut is required")
    String heureDebut,

    @NotBlank(message = "heureFin is required")
    String heureFin,

    Integer dureePauseMinutes
) {
    public static ShiftPresetDTO from(ShiftPreset preset) {
        if (preset == null) return null;
        return new ShiftPresetDTO(
            preset.getId(),
            preset.getTypeShift(),
            preset.getNom(),
            preset.getHeureDebut(),
            preset.getHeureFin(),
            preset.getDureePauseMinutes()
        );
    }
}
