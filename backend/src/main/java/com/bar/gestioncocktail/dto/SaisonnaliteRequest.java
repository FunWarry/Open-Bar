package com.bar.gestioncocktail.dto;
/**
 * Request DTO for configuring cocktail seasonal availability periods.
 */

public record SaisonnaliteRequest(Integer moisDebut, Integer moisFin) {}
