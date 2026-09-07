package com.bar.gestioncocktail.model;
/**
 * Enumeration of user roles and permission levels (ADMIN, MANAGER, SERVEUR, BARMAN, CLIENT).
 */

public enum UserRole {
    ADMIN,
    MANAGER,
    SERVEUR,
    BARMAN;

    public String getName() {
        return name();
    }
} 