package com.bar.gestioncocktail.model;

public enum UserRole {
    ADMIN,
    MANAGER,
    SERVEUR,
    BARMAN;

    public String getName() {
        return name();
    }
} 