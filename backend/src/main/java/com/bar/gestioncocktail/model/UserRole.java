package com.bar.gestioncocktail.model;

public enum UserRole {
    ADMIN,
    SERVEUR,
    BARMEN;

    public String getName() {
        return name();
    }
} 