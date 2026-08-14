package com.bar.gestioncocktail.dto;

public record TablePositionDTO(
    Long id,
    Double planX,
    Double planY,
    Double planRotation,
    String planForme,
    Double planWidth,
    Double planHeight
) {}
