package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PageResponseDTO;
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

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("secret");
        user.setRoles(Set.of(UserRole.ADMIN));
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
    @DisplayName("getAllUsers - retrieves list of all users")
    void getAllUsers_success() {
        when(userService.getAllUsers()).thenReturn(List.of(user));

        ResponseEntity<List<UserResponseDTO>> response = userController.getAllUsers();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).username()).isEqualTo("testuser");
    }

    @Test
    @DisplayName("updateUser - sets ID and updates user")
    void updateUser_success() {
        UserRequestDTO request = new UserRequestDTO("testuser", "secret", "test@example.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.updateUser(eq(1L), any(User.class))).thenReturn(user);

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
    @DisplayName("getUserById - returns DTO if found, 404 otherwise")
    void getUserById_foundAndNotFound() {
        when(userService.getUserById(1L)).thenReturn(Optional.of(user));
        when(userService.getUserById(99L)).thenReturn(Optional.empty());

        ResponseEntity<UserResponseDTO> found = userController.getUserById(1L);
        ResponseEntity<UserResponseDTO> notFound = userController.getUserById(99L);

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("getUserByUsername, getUsersByRole, checkUsernameExists, checkEmailExists")
    void additionalQueries() {
        when(userService.getUserByUsername("testuser")).thenReturn(Optional.of(user));
        when(userService.getUserByUsername("unknown")).thenReturn(Optional.empty());
        when(userService.getUsersByRole(UserRole.ADMIN)).thenReturn(List.of(user));
        when(userService.existsByUsername("testuser")).thenReturn(true);
        when(userService.existsByEmail("test@example.com")).thenReturn(false);

        assertThat(userController.getUserByUsername("testuser").getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(userController.getUserByUsername("unknown").getStatusCode().value()).isEqualTo(404);
        assertThat(userController.getUsersByRole(UserRole.ADMIN).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(userController.checkUsernameExists("testuser").getBody()).isTrue();
        assertThat(userController.checkEmailExists("test@example.com").getBody()).isFalse();
    }

    @Test
    @DisplayName("changePassword - updates password when user exists")
    void changePassword_success() {
        when(userService.getUserById(1L)).thenReturn(Optional.of(user));

        ResponseEntity<Void> response = userController.changePassword(1L, "newPassword123");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(userService).changePassword(user, "newPassword123");
    }

    @Test
    @DisplayName("getUsersPaged - returns paginated DTO")
    void getUsersPaged_success() {
        PageResponseDTO<UserResponseDTO> pageDto =
            PageResponseDTO.of(List.of(UserResponseDTO.from(user)), 0, 10, 1);
        when(userService.getUsersPaged(0, 10, "test", "ADMIN")).thenReturn(pageDto);

        ResponseEntity<PageResponseDTO<UserResponseDTO>> response =
            userController.getUsersPaged(0, 10, "test", "ADMIN");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().totalElements()).isEqualTo(1);
    }
}
