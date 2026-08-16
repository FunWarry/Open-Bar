package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.service.SampleDataSeederService;
import com.bar.gestioncocktail.service.SetupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

/**
 * REST controller managing application initialization and first-run setup
 * (setup wizard and demo seed dataset).
 */
@RestController
@RequestMapping("/api/setup")
@Tag(name = "Setup", description = "System initialization, initial admin account creation, and demo data seeding")
public class SetupController {

    private final SetupService setupService;
    private final Optional<SampleDataSeederService> sampleDataSeederService;

    /**
     * Constructs the controller with setup service and optional sample data seeder.
     *
     * @param setupService Service managing initial setup configuration
     * @param sampleDataSeederService Optional service for demo dataset seeding
     */
    public SetupController(SetupService setupService, Optional<SampleDataSeederService> sampleDataSeederService) {
        this.setupService = setupService;
        this.sampleDataSeederService = sampleDataSeederService;
    }

    /**
     * Checks if the application has already been configured (presence of an administrator account).
     *
     * @return DTO indicating whether setup is required
     */
    @GetMapping("/status")
    @Operation(summary = "Check application initialization status", description = "Returns true if an administrator already exists.")
    @ApiResponse(responseCode = "200", description = "Configuration status returned")
    public ResponseEntity<SetupStatusDTO> getStatus() {
        return ResponseEntity.ok(setupService.getSetupStatus());
    }

    /**
     * Creates the initial administrator account on first application launch.
     *
     * @param request Admin credentials and details
     * @return DTO of created administrator user
     */
    @PostMapping("/admin")
    @Operation(summary = "Create initial administrator", description = "Disabled as soon as an administrator account already exists.")
    @ApiResponse(responseCode = "200", description = "Administrator account created successfully")
    @ApiResponse(responseCode = "400", description = "An administrator already exists or invalid data")
    public ResponseEntity<UserResponseDTO> createAdmin(@Valid @RequestBody CreateAdminRequestDTO request) {
        return ResponseEntity.ok(setupService.createInitialAdmin(request));
    }

    /**
     * Generates a complete demo dataset (Users, Floors, Zones, Tables, Shifts, Orders, Invoices).
     *
     * @return Confirmation message of test data generation
     */
    @PostMapping("/seed-demo")
    @Operation(summary = "Generate complete test demo dataset", description = "Populates database with floors, zones, tables, staff users, shifts, orders, and invoices.")
    @ApiResponse(responseCode = "200", description = "Demo dataset generated successfully")
    public ResponseEntity<Map<String, String>> seedDemoData() {
        if (sampleDataSeederService.isPresent()) {
            sampleDataSeederService.get().seedAllDemoData();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Demo dataset (floors, zones, tables, staff, shifts, orders, invoices) generated successfully."
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "status", "skipped",
                    "message", "Demo data seeder is disabled in production environment."
            ));
        }
    }
}
