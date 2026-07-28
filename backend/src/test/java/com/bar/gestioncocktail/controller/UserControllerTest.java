package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.UserRequestDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    UserService userService;

    @InjectMocks
    UserController userController;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("secret");
        user.setRoles(Set.of(UserRole.SERVEUR));
    }

    @Test
    @DisplayName("createUser - calls service and returns DTO")
    void createUser_success() {
        UserRequestDTO request = new UserRequestDTO("testuser", "secret", "test@example.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.createUser(any(User.class))).thenReturn(user);

        ResponseEntity<UserResponseDTO> response = userController.createUser(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().username()).isEqualTo("testuser");
    }

    @Test
    @DisplayName("updateUser - sets ID and updates user")
    void updateUser_success() {
        UserRequestDTO request = new UserRequestDTO("testuser", "secret", "test@example.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.updateUser(any(User.class))).thenReturn(user);

        ResponseEntity<UserResponseDTO> response = userController.updateUser(1L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("deleteUser - calls service delete")
    void deleteUser_success() {
        ResponseEntity<Void> response = userController.deleteUser(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(userService).deleteUser(1L);
    }

    @Test
    @DisplayName("getUserById - returns DTO if found")
    void getUserById_found() {
        when(userService.getUserById(1L)).thenReturn(Optional.of(user));

        ResponseEntity<UserResponseDTO> response = userController.getUserById(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("getUserById - returns 404 if not found")
    void getUserById_notFound() {
        when(userService.getUserById(1L)).thenReturn(Optional.empty());

        ResponseEntity<UserResponseDTO> response = userController.getUserById(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }
}
