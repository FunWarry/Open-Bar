package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.service.SetupService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SetupControllerTest {

    @Mock
    SetupService setupService;

    @InjectMocks
    SetupController controller;

    @Test
    @DisplayName("getStatus - returns setup status DTO")
    void getStatus_success() {
        SetupStatusDTO status = new SetupStatusDTO(true, 5L);
        when(setupService.getSetupStatus()).thenReturn(status);

        ResponseEntity<SetupStatusDTO> response = controller.getStatus();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().initialized()).isTrue();
    }

    @Test
    @DisplayName("createAdmin - creates admin user and returns DTO")
    void createAdmin_success() {
        CreateAdminRequestDTO request = new CreateAdminRequestDTO("admin", "admin@bar.com", "pass", "Admin", "Super");
        UserResponseDTO userResponse = new UserResponseDTO(1L, "admin", "admin@bar.com", "Admin", "Super", Set.of(UserRole.ADMIN), LocalDateTime.now(), LocalDateTime.now());

        when(setupService.createInitialAdmin(request)).thenReturn(userResponse);

        ResponseEntity<UserResponseDTO> response = controller.createAdmin(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().username()).isEqualTo("admin");
    }
}
