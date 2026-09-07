package com.bar.gestioncocktail.dto;
/**
 * DTO representing spatial coordinates, dimensions, and rotation of a table on the floor plan canvas.
 */

public record TablePositionDTO(
    Long id,
    Double planX,
    Double planY,
    Double planRotation,
    String planForme,
    Double planWidth,
    Double planHeight
) {}
