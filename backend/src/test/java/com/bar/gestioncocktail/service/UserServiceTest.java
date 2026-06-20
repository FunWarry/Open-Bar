package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    PasswordEncoder passwordEncoder;

    @InjectMocks
    UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("jean.dupont");
        user.setPassword("motdepasse");
        user.setEmail("jean.dupont@bar.com");
        user.setRoles(Set.of(UserRole.SERVEUR));
    }

    @Test
    void createUser_hashLePassword() {
        when(passwordEncoder.encode("motdepasse")).thenReturn("$2a$hashed");
        when(userRepository.save(any(User.class))).thenReturn(user);

        userService.createUser(user);

        verify(passwordEncoder, times(1)).encode("motdepasse");
        assertThat(user.getPassword()).isEqualTo("$2a$hashed");
    }

    @Test
    void getUserById_existant_retourne() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Optional<User> result = userService.getUserById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("jean.dupont");
    }

    @Test
    void getUserByUsername_existant_retourne() {
        when(userRepository.findByUsername("jean.dupont")).thenReturn(Optional.of(user));

        Optional<User> result = userService.getUserByUsername("jean.dupont");

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("jean.dupont@bar.com");
    }

    @Test
    void getUsersByRole_filtreSurRole() {
        User barman = new User();
        barman.setId(2L);
        barman.setUsername("marc.barman");
        barman.setRoles(Set.of(UserRole.BARMAN));

        when(userRepository.findByRolesContaining(UserRole.BARMAN)).thenReturn(List.of(barman));

        List<User> result = userService.getUsersByRole(UserRole.BARMAN);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUsername()).isEqualTo("marc.barman");
        assertThat(result.get(0).getRoles()).contains(UserRole.BARMAN);
    }
}
