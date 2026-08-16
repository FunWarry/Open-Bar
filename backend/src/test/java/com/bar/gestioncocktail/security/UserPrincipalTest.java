package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    @Test
    @DisplayName("create - constructs UserPrincipal from User entity with roles")
    void create_fromUser_populatesAllFields() {
        User user = new User();
        user.setId(42L);
        user.setUsername("testuser");
        user.setEmail("test@bar.com");
        user.setPassword("hashedpassword");
        user.setRoles(Set.of(UserRole.ADMIN, UserRole.BARMAN));

        UserPrincipal principal = UserPrincipal.create(user);

        assertThat(principal.getId()).isEqualTo(42L);
        assertThat(principal.getUsername()).isEqualTo("testuser");
        assertThat(principal.getEmail()).isEqualTo("test@bar.com");
        assertThat(principal.getPassword()).isEqualTo("hashedpassword");
        assertThat(principal.getAuthorities())
                .extracting("authority")
                .containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_BARMAN");
        assertThat(principal.isAccountNonExpired()).isTrue();
        assertThat(principal.isAccountNonLocked()).isTrue();
        assertThat(principal.isCredentialsNonExpired()).isTrue();
        assertThat(principal.isEnabled()).isTrue();
    }
}
