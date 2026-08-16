package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.ShiftPresetDTO;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.service.ShiftPresetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing shift template presets (working hour schedule templates).
 */
@RestController
@RequestMapping("/api/shift-presets")
@Tag(name = "Shift Presets", description = "Management of default shift template presets and working hours")
public class ShiftPresetController {

    private final ShiftPresetService presetService;

    public ShiftPresetController(ShiftPresetService presetService) {
        this.presetService = presetService;
    }

    @GetMapping
    @Operation(summary = "Get all shift presets", description = "Retrieves all default shift presets (Morning, Evening, Split, Night, Leave).")
    @ApiResponse(responseCode = "200", description = "List of shift presets retrieved successfully")
    public ResponseEntity<List<ShiftPresetDTO>> getAllPresets() {
        return ResponseEntity.ok(presetService.getAllPresets());
    }

    @PutMapping("/{typeShift}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update a shift preset", description = "Allows Managers/Admins to update default start/end times and break duration for a shift type.")
    @ApiResponse(responseCode = "200", description = "Shift preset updated successfully")
    public ResponseEntity<ShiftPresetDTO> updatePreset(
            @PathVariable TypeShift typeShift,
            @Valid @RequestBody ShiftPresetDTO dto) {
        return ResponseEntity.ok(presetService.updatePreset(typeShift, dto));
    }
}
