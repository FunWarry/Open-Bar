package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.service.SampleDataSeederService;
import com.bar.gestioncocktail.service.SetupService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SetupControllerTest {

    @Mock
    private SetupService setupService;

    @Mock
    private SampleDataSeederService sampleDataSeederService;

    @Test
    @DisplayName("getStatus - returns setup status DTO")
    void getStatus_success() {
        SetupController controller = new SetupController(setupService, Optional.of(sampleDataSeederService));
        SetupStatusDTO status = new SetupStatusDTO(true, 5L);
        when(setupService.getSetupStatus()).thenReturn(status);

        ResponseEntity<SetupStatusDTO> response = controller.getStatus();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().initialized()).isTrue();
    }

    @Test
    @DisplayName("createAdmin - creates admin user and returns DTO")
    void createAdmin_success() {
        SetupController controller = new SetupController(setupService, Optional.of(sampleDataSeederService));
        CreateAdminRequestDTO request = new CreateAdminRequestDTO("admin", "admin@bar.com", "pass", "Admin", "Super");
        UserResponseDTO userResponse = new UserResponseDTO(1L, "admin", "admin@bar.com", "Admin", "Super", Set.of(UserRole.ADMIN), LocalDateTime.now(), LocalDateTime.now());

        when(setupService.createInitialAdmin(request)).thenReturn(userResponse);

        ResponseEntity<UserResponseDTO> response = controller.createAdmin(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().username()).isEqualTo("admin");
    }

    @Test
    @DisplayName("seedDemoData - seeds demo data when seeder service is present")
    void seedDemoData_present_success() {
        SetupController controller = new SetupController(setupService, Optional.of(sampleDataSeederService));

        ResponseEntity<Map<String, String>> response = controller.seedDemoData();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("status", "success");
        verify(sampleDataSeederService).seedAllDemoData();
    }

    @Test
    @DisplayName("seedDemoData - skips when seeder service is absent")
    void seedDemoData_absent_skipped() {
        SetupController controller = new SetupController(setupService, Optional.empty());

        ResponseEntity<Map<String, String>> response = controller.seedDemoData();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("status", "skipped");
    }

    @Test
    @DisplayName("cleanTestData - purges test data when seeder service is present")
    void cleanTestData_present_success() {
        SetupController controller = new SetupController(setupService, Optional.of(sampleDataSeederService));

        ResponseEntity<Map<String, String>> response = controller.cleanTestData();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("status", "success");
        verify(sampleDataSeederService).cleanPollutedTestData();
    }

    @Test
    @DisplayName("cleanTestData - skips when seeder service is absent")
    void cleanTestData_absent_skipped() {
        SetupController controller = new SetupController(setupService, Optional.empty());

        ResponseEntity<Map<String, String>> response = controller.cleanTestData();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("status", "skipped");
    }
}
