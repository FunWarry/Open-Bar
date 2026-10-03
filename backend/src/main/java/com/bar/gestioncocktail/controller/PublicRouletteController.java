package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.RoulettePublicConfigDTO;
import com.bar.gestioncocktail.dto.RouletteSpinRequestDTO;
import com.bar.gestioncocktail.dto.RouletteSpinResultDTO;
import com.bar.gestioncocktail.service.RouletteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public REST controller for customer Mystery Drink Roulette wheel operations.
 * Allows anonymous patrons via QR mobile ordering to inspect roulette configuration
 * and spin for surprise cocktails.
 */
@RestController
@RequestMapping("/api/public/roulette")
@Tag(name = "Public Roulette", description = "Public operations for Cocktail Roulette and Mystery Drink gamification")
public class PublicRouletteController {

    private final RouletteService rouletteService;

    /**
     * Constructs the controller with the roulette service.
     *
     * @param rouletteService Roulette service
     */
    public PublicRouletteController(RouletteService rouletteService) {
        this.rouletteService = rouletteService;
    }

    /**
     * Retrieves public configuration, active wheel sectors and pricing for the roulette.
     *
     * @return Public roulette configuration
     */
    @GetMapping("/config")
    @Operation(summary = "Get roulette public configuration", description = "Returns active wheel sectors, discounted pricing, and spirit filter options.")
    @ApiResponse(responseCode = "200", description = "Configuration successfully retrieved")
    public ResponseEntity<RoulettePublicConfigDTO> getConfig() {
        return ResponseEntity.ok(rouletteService.getPublicConfig());
    }

    /**
     * Resolves a customer roulette wheel spin with optional spirit and dietary filters.
     *
     * @param request Spin filters and options
     * @return Resolved winning outcome
     */
    @PostMapping("/spin")
    @Operation(summary = "Spin the cocktail roulette wheel", description = "Resolves a weighted spin based on inventory depletion rules and returns the winning drink.")
    @ApiResponse(responseCode = "200", description = "Wheel successfully spun")
    @ApiResponse(responseCode = "400", description = "Roulette module disabled or invalid parameters")
    public ResponseEntity<RouletteSpinResultDTO> spin(@RequestBody RouletteSpinRequestDTO request) {
        return ResponseEntity.ok(rouletteService.spin(request));
    }

    /**
     * Verifies a 4-digit PIN for access to the public roulette display TV screen.
     *
     * @param request PIN verification payload
     * @return Verification outcome
     */
    @PostMapping("/verify-pin")
    @Operation(summary = "Verify roulette TV display PIN", description = "Validates the 4-digit access code required to unlock the display screen.")
    @ApiResponse(responseCode = "200", description = "PIN verification completed")
    public ResponseEntity<com.bar.gestioncocktail.dto.RoulettePinVerificationResponseDTO> verifyPin(
            @jakarta.validation.Valid @RequestBody com.bar.gestioncocktail.dto.RoulettePinVerificationRequestDTO request) {
        return ResponseEntity.ok(rouletteService.verifyDisplayPin(request.pin()));
    }
}
