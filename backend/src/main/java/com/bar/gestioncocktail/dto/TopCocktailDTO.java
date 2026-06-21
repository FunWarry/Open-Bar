package com.bar.gestioncocktail.dto;

public record TopCocktailDTO(
    Long cocktailId,
    String nom,
    long nombreCommandes
) {}
