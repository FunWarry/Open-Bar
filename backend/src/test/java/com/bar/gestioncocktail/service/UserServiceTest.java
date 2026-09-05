package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.PageResponseDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    PasswordEncoder passwordEncoder;

    @Spy
    TimeService timeService = new TimeService(null);

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

    @Test
    @DisplayName("loadUserByUsername - returns UserDetails when user exists")
    void loadUserByUsername_success() {
        when(userRepository.findByUsername("jean.dupont")).thenReturn(Optional.of(user));

        UserDetails userDetails = userService.loadUserByUsername("jean.dupont");

        assertThat(userDetails.getUsername()).isEqualTo("jean.dupont");
        assertThat(userDetails.getAuthorities()).hasSize(1);
    }

    @Test
    @DisplayName("loadUserByUsername - throws UsernameNotFoundException when missing")
    void loadUserByUsername_notFound() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.loadUserByUsername("unknown"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    @DisplayName("updateUser - updates timestamp and saves user")
    void updateUser_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        User updateData = new User();
        updateData.setNom("UpdatedName");

        User updated = userService.updateUser(1L, updateData);

        assertThat(updated).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("deleteUser - deletes user by id")
    void deleteUser_success() {
        userService.deleteUser(1L);
        verify(userRepository).deleteById(1L);
    }

    @Test
    @DisplayName("existsByUsername - returns boolean result")
    void existsByUsername_returnsBoolean() {
        when(userRepository.existsByUsername("jean.dupont")).thenReturn(true);
        assertThat(userService.existsByUsername("jean.dupont")).isTrue();
    }

    @Test
    @DisplayName("existsByEmail - returns boolean result")
    void existsByEmail_returnsBoolean() {
        when(userRepository.existsByEmail("jean.dupont@bar.com")).thenReturn(true);
        assertThat(userService.existsByEmail("jean.dupont@bar.com")).isTrue();
    }

    @Test
    @DisplayName("changePassword - encodes new password and saves user")
    void changePassword_success() {
        when(passwordEncoder.encode("newpass")).thenReturn("$2a$newhashed");

        userService.changePassword(user, "newpass");

        assertThat(user.getPassword()).isEqualTo("$2a$newhashed");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("getUsersPaged - filters by search query and role correctly")
    void getUsersPaged_filtersCorrectly() {
        User adminUser = new User();
        adminUser.setId(2L);
        adminUser.setUsername("admin.boss");
        adminUser.setEmail("admin@bar.com");
        adminUser.setNom("Boss");
        adminUser.setPrenom("Chief");
        adminUser.setRoles(Set.of(UserRole.ADMIN));

        when(userRepository.findAll()).thenReturn(List.of(user, adminUser));

        PageResponseDTO<UserResponseDTO> result =
            userService.getUsersPaged(0, 10, "chief", "ADMIN");

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().get(0).username()).isEqualTo("admin.boss");
    }
}
