package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;

import java.util.Set;

/**
 * Request DTO for creating a new user account.
 *
 * @param username Unique login name for the user
 * @param password Plain-text password (will be encoded by the service)
 * @param email Unique email address
 * @param nom Last name
 * @param prenom First name
 * @param roles Set of roles to assign to the user
 */
public record UserRequestDTO(
    String username,
    String password,
    String email,
    String nom,
    String prenom,
    Set<UserRole> roles
) {
    /**
     * Converts this DTO into a {@link User} JPA entity.
     *
     * @return A new {@link User} entity instance with the given attributes
     */
    public User toEntity() {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setEmail(email);
        user.setNom(nom);
        user.setPrenom(prenom);
        if (roles != null) {
            user.setRoles(roles);
        }
        return user;
    }
}
