package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.HappyHourRuleRequestDTO;
import com.bar.gestioncocktail.dto.HappyHourRuleResponseDTO;
import com.bar.gestioncocktail.dto.PricingPreviewResponseDTO;
import com.bar.gestioncocktail.model.HappyHourRule;
import com.bar.gestioncocktail.service.HappyHourService;
import com.bar.gestioncocktail.service.TimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * REST controller managing Happy Hour promotional pricing rules and dynamic schedule calculations.
 */
@RestController
@RequestMapping("/api/happy-hour")
@Tag(name = "Happy Hour", description = "Promotional Happy Hour and dynamic pricing rule engine management")
public class HappyHourController {

    private final HappyHourService happyHourService;
    private final TimeService timeService;

    /**
     * Constructs the controller with the happy hour service and time service.
     *
     * @param happyHourService Business service for promotional pricing
     * @param timeService      Application time service
     */
    public HappyHourController(HappyHourService happyHourService, TimeService timeService) {
        this.happyHourService = happyHourService;
        this.timeService = timeService;
    }

    /**
     * Retrieves all configured Happy Hour promotional rules.
     *
     * @return List of all rules
     */
    @GetMapping
    @Operation(summary = "List all Happy Hour rules", description = "Retrieves all configured promotional pricing rules.")
    @ApiResponse(responseCode = "200", description = "List of rules successfully retrieved")
    public ResponseEntity<List<HappyHourRuleResponseDTO>> getAllRules() {
        LocalDateTime now = timeService.now();
        List<HappyHourRuleResponseDTO> rules = happyHourService.getAllRules().stream()
                .map(rule -> HappyHourRuleResponseDTO.from(rule, now))
                .toList();
        return ResponseEntity.ok(rules);
    }

    /**
     * Retrieves all currently active Happy Hour rules.
     *
     * @return List of enabled rules
     */
    @GetMapping("/active")
    @Operation(summary = "List active Happy Hour rules", description = "Retrieves promotional rules currently marked as active.")
    @ApiResponse(responseCode = "200", description = "List of active rules successfully retrieved")
    public ResponseEntity<List<HappyHourRuleResponseDTO>> getActiveRules() {
        LocalDateTime now = timeService.now();
        List<HappyHourRuleResponseDTO> rules = happyHourService.getActiveRules().stream()
                .map(rule -> HappyHourRuleResponseDTO.from(rule, now))
                .toList();
        return ResponseEntity.ok(rules);
    }

    /**
     * Retrieves a single Happy Hour rule by its unique identifier.
     *
     * @param id Rule identifier
     * @return Found rule DTO
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get Happy Hour rule by ID", description = "Retrieves details of a specific promotional rule.")
    @ApiResponse(responseCode = "200", description = "Rule found")
    @ApiResponse(responseCode = "404", description = "Rule not found")
    public ResponseEntity<HappyHourRuleResponseDTO> getRuleById(@Parameter(description = "Rule ID") @PathVariable Long id) {
        LocalDateTime now = timeService.now();
        return happyHourService.getRuleById(id)
                .map(rule -> HappyHourRuleResponseDTO.from(rule, now))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Creates a new Happy Hour promotional rule.
     *
     * @param request Rule definition payload
     * @return Created rule DTO
     */
    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Create a Happy Hour rule (MANAGER/ADMIN)", description = "Creates and activates a new promotional pricing rule.")
    @ApiResponse(responseCode = "201", description = "Rule created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request payload")
    public ResponseEntity<HappyHourRuleResponseDTO> createRule(@Valid @RequestBody HappyHourRuleRequestDTO request) {
        HappyHourRule created = happyHourService.createRule(request.toEntity());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(HappyHourRuleResponseDTO.from(created, timeService.now()));
    }

    /**
     * Updates an existing Happy Hour promotional rule.
     *
     * @param id      Rule identifier to update
     * @param request Updated rule definition payload
     * @return Updated rule DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Update a Happy Hour rule (MANAGER/ADMIN)", description = "Updates attributes of an existing promotional pricing rule.")
    @ApiResponse(responseCode = "200", description = "Rule updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request payload")
    @ApiResponse(responseCode = "404", description = "Rule not found")
    public ResponseEntity<HappyHourRuleResponseDTO> updateRule(
            @Parameter(description = "Rule ID") @PathVariable Long id,
            @Valid @RequestBody HappyHourRuleRequestDTO request
    ) {
        HappyHourRule updated = happyHourService.updateRule(id, request.toEntity());
        return ResponseEntity.ok(HappyHourRuleResponseDTO.from(updated, timeService.now()));
    }

    /**
     * Deletes a Happy Hour rule.
     *
     * @param id Rule identifier to delete
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Delete a Happy Hour rule (MANAGER/ADMIN)", description = "Permanently removes a promotional pricing rule.")
    @ApiResponse(responseCode = "204", description = "Rule deleted successfully")
    @ApiResponse(responseCode = "404", description = "Rule not found")
    public ResponseEntity<Void> deleteRule(@Parameter(description = "Rule ID") @PathVariable Long id) {
        happyHourService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Toggles the active status of a rule.
     *
     * @param id Rule identifier
     * @return Updated rule DTO with new active state
     */
    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Toggle rule active status (MANAGER/ADMIN)", description = "Quickly enables or disables a promotional pricing rule.")
    @ApiResponse(responseCode = "200", description = "Active status toggled successfully")
    @ApiResponse(responseCode = "404", description = "Rule not found")
    public ResponseEntity<HappyHourRuleResponseDTO> toggleActive(@Parameter(description = "Rule ID") @PathVariable Long id) {
        HappyHourRule updated = happyHourService.toggleActive(id);
        return ResponseEntity.ok(HappyHourRuleResponseDTO.from(updated, timeService.now()));
    }

    /**
     * Simulates dynamic pricing for a cocktail at a given point in time.
     *
     * @param cocktailId Unique cocktail identifier
     * @param varianteId Optional variant identifier
     * @param timestamp  Optional simulation timestamp (defaults to current server time)
     * @return Detailed pricing preview simulation DTO
     */
    @GetMapping("/pricing-preview")
    @Operation(summary = "Simulate cocktail pricing", description = "Calculates the effective price and promotional savings for a drink at an arbitrary date and time.")
    @ApiResponse(responseCode = "200", description = "Pricing simulation successfully evaluated")
    @ApiResponse(responseCode = "404", description = "Cocktail or variant not found")
    public ResponseEntity<PricingPreviewResponseDTO> simulatePricing(
            @Parameter(description = "Cocktail ID") @RequestParam Long cocktailId,
            @Parameter(description = "Optional variant ID") @RequestParam(required = false) Long varianteId,
            @Parameter(description = "Optional evaluation timestamp (ISO-8601)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime timestamp
    ) {
        PricingPreviewResponseDTO preview = happyHourService.simulatePricing(cocktailId, varianteId, timestamp);
        return ResponseEntity.ok(preview);
    }
}
