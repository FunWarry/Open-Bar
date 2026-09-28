package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.RouletteBroadcastSpinRequestDTO;
import com.bar.gestioncocktail.dto.RouletteSpinResultDTO;
import com.bar.gestioncocktail.dto.RouletteWheelSectorDTO;
import com.bar.gestioncocktail.dto.RouletteWheelSectorRequestDTO;
import com.bar.gestioncocktail.service.RouletteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authenticated staff managing and triggering the Cocktail Roulette.
 * Enables bartenders to remotely broadcast spins to public secondary screens
 * and managers to customize wheel sectors.
 */
@RestController
@RequestMapping("/api/roulette")
@Tag(name = "Roulette Management", description = "Bartender live triggers and manager wheel sector administration")
public class RouletteController {

    private final RouletteService rouletteService;

    /**
     * Constructs the controller with the roulette service.
     *
     * @param rouletteService Roulette service
     */
    public RouletteController(RouletteService rouletteService) {
        this.rouletteService = rouletteService;
    }

    /**
     * Triggers a live broadcast roulette spin for secondary screens with optional rigging.
     *
     * @param request Bartender trigger parameters and override options
     * @return Resolved spin outcome
     */
    @PostMapping("/trigger-broadcast")
    @PreAuthorize("hasAnyRole('BARMAN', 'MANAGER', 'ADMIN', 'SERVEUR')")
    @Operation(summary = "Trigger live roulette broadcast", description = "Broadcasts a real-time spin to secondary screens and TV displays with optional secret outcome rigging.")
    @ApiResponse(responseCode = "200", description = "Broadcast successfully initiated")
    @ApiResponse(responseCode = "400", description = "Roulette module disabled or invalid parameters")
    public ResponseEntity<RouletteSpinResultDTO> triggerBroadcast(@Valid @RequestBody RouletteBroadcastSpinRequestDTO request) {
        return ResponseEntity.ok(rouletteService.triggerBroadcastSpin(request));
    }

    /**
     * Retrieves all wheel sectors configured for the establishment.
     *
     * @return List of wheel sectors
     */
    @GetMapping("/sectors")
    @PreAuthorize("hasAnyRole('BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get all roulette wheel sectors", description = "Returns all configured slices and rewards on the roulette wheel.")
    @ApiResponse(responseCode = "200", description = "Sectors successfully retrieved")
    public ResponseEntity<List<RouletteWheelSectorDTO>> getAllSectors() {
        return ResponseEntity.ok(rouletteService.getAllSectors());
    }

    /**
     * Creates a new sector on the roulette wheel.
     *
     * @param dto Sector creation payload
     * @return Created sector
     */
    @PostMapping("/sectors")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Create wheel sector", description = "Adds a new slice/reward to the cocktail roulette wheel.")
    @ApiResponse(responseCode = "201", description = "Sector created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error")
    public ResponseEntity<RouletteWheelSectorDTO> createSector(@Valid @RequestBody RouletteWheelSectorRequestDTO dto) {
        RouletteWheelSectorDTO created = rouletteService.createSector(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing sector on the roulette wheel.
     *
     * @param id  Sector ID
     * @param dto Update payload
     * @return Updated sector
     */
    @PutMapping("/sectors/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Update wheel sector", description = "Modifies an existing sector's properties or reward on the roulette wheel.")
    @ApiResponse(responseCode = "200", description = "Sector updated successfully")
    @ApiResponse(responseCode = "404", description = "Sector not found")
    public ResponseEntity<RouletteWheelSectorDTO> updateSector(
            @Parameter(description = "Sector ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody RouletteWheelSectorRequestDTO dto) {
        return ResponseEntity.ok(rouletteService.updateSector(id, dto));
    }

    /**
     * Deletes a sector from the roulette wheel.
     *
     * @param id Sector ID
     * @return No content
     */
    @DeleteMapping("/sectors/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Delete wheel sector", description = "Removes a sector from the cocktail roulette wheel.")
    @ApiResponse(responseCode = "204", description = "Sector deleted successfully")
    @ApiResponse(responseCode = "404", description = "Sector not found")
    public ResponseEntity<Void> deleteSector(
            @Parameter(description = "Sector ID", example = "1") @PathVariable Long id) {
        rouletteService.deleteSector(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieves the current 4-digit PIN for the roulette TV display screen.
     *
     * @return Current PIN payload
     */
    @GetMapping("/pin")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get roulette TV display PIN", description = "Returns the active 4-digit PIN code used to unlock the roulette display screen.")
    @ApiResponse(responseCode = "200", description = "PIN retrieved successfully")
    public ResponseEntity<com.bar.gestioncocktail.dto.RoulettePinDTO> getPin() {
        return ResponseEntity.ok(rouletteService.getDisplayPin());
    }

    /**
     * Updates the 4-digit PIN for the roulette TV display screen and revokes all active TV sessions.
     *
     * @param dto PIN update payload
     * @return Updated PIN payload
     */
    @PutMapping("/pin")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Update roulette TV display PIN", description = "Updates the 4-digit access code and forces active display screens to re-authenticate.")
    @ApiResponse(responseCode = "200", description = "PIN updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid PIN format (must be 4 digits)")
    public ResponseEntity<com.bar.gestioncocktail.dto.RoulettePinDTO> updatePin(
            @jakarta.validation.Valid @RequestBody com.bar.gestioncocktail.dto.RoulettePinDTO dto) {
        return ResponseEntity.ok(rouletteService.updateDisplayPin(dto.pin()));
    }

    /**
     * Regenerates a new random 4-digit PIN for the roulette display screen and revokes active TV sessions.
     *
     * @return Newly generated PIN payload
     */
    @PostMapping("/pin/regenerate")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Regenerate roulette TV display PIN", description = "Generates a fresh random 4-digit access code in 1 click and revokes active display sessions.")
    @ApiResponse(responseCode = "200", description = "PIN regenerated successfully")
    public ResponseEntity<com.bar.gestioncocktail.dto.RoulettePinDTO> regeneratePin() {
        return ResponseEntity.ok(rouletteService.regenerateDisplayPin());
    }
}
