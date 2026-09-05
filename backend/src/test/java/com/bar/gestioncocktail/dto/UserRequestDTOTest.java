package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class UserRequestDTOTest {

    @Test
    @DisplayName("toEntity - should map all fields to a User entity")
    void toEntity_mapsAllFields() {
        UserRequestDTO dto = new UserRequestDTO(
            "john.doe", "password123", "john@example.com",
            "Doe", "John", Set.of(UserRole.SERVEUR)
        );

        User user = dto.toEntity();

        assertThat(user).isNotNull();
        assertThat(user.getUsername()).isEqualTo("john.doe");
        assertThat(user.getPassword()).isEqualTo("password123");
        assertThat(user.getEmail()).isEqualTo("john@example.com");
        assertThat(user.getNom()).isEqualTo("Doe");
        assertThat(user.getPrenom()).isEqualTo("John");
        assertThat(user.getRoles()).containsExactly(UserRole.SERVEUR);
    }

    @Test
    @DisplayName("toEntity - should handle null roles gracefully")
    void toEntity_nullRoles_doesNotSetRoles() {
        UserRequestDTO dto = new UserRequestDTO(
            "jane.doe", "secret", "jane@example.com", "Doe", "Jane", null
        );

        User user = dto.toEntity();

        assertThat(user.getUsername()).isEqualTo("jane.doe");
        // roles set should be left empty (default empty HashSet from entity)
        assertThat(user.getRoles()).isEmpty();
    }
}
