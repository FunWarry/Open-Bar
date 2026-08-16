package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.RecipeStepTemplateRequestDTO;
import com.bar.gestioncocktail.dto.RecipeStepTemplateResponseDTO;
import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.service.RecipeStepTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller managing reusable mixology action step templates.
 */
@RestController
@RequestMapping("/api/recipe-step-templates")
@Tag(name = "Recipe Step Templates", description = "Endpoints for managing reusable preparation step templates")
public class RecipeStepTemplateController {

    private final RecipeStepTemplateService templateService;

    /**
     * Constructs the controller with required template service.
     *
     * @param templateService Service managing recipe step templates
     */
    public RecipeStepTemplateController(RecipeStepTemplateService templateService) {
        this.templateService = templateService;
    }

    /**
     * Retrieves all recipe step templates.
     *
     * @param actionType Optional filter by action category
     * @return List of template response DTOs
     */
    @GetMapping
    @Operation(summary = "Get all step templates", description = "Retrieves all reusable preparation step templates, optionally filtered by action category.")
    @ApiResponse(responseCode = "200", description = "List of templates retrieved successfully")
    public ResponseEntity<List<RecipeStepTemplateResponseDTO>> getAllTemplates(
        @Parameter(description = "Optional filter by action type") @RequestParam(required = false) RecipeStepActionType actionType
    ) {
        if (actionType != null) {
            return ResponseEntity.ok(templateService.getTemplatesByActionType(actionType));
        }
        return ResponseEntity.ok(templateService.getAllTemplates());
    }

    /**
     * Retrieves a single template by ID.
     *
     * @param id Template ID
     * @return Found template response DTO
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get template by ID", description = "Retrieves a reusable preparation step template by its identifier.")
    @ApiResponse(responseCode = "200", description = "Template retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Template not found")
    public ResponseEntity<RecipeStepTemplateResponseDTO> getTemplateById(
        @Parameter(description = "Template ID") @PathVariable Long id
    ) {
        return ResponseEntity.ok(templateService.getTemplateById(id));
    }

    /**
     * Creates a new reusable preparation template.
     *
     * @param request Creation request DTO
     * @return Created template response DTO
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Create step template (BARMAN/ADMIN/MANAGER)", description = "Adds a new reusable preparation action template.")
    @ApiResponse(responseCode = "200", description = "Template created successfully")
    @ApiResponse(responseCode = "403", description = "Access denied")
    public ResponseEntity<RecipeStepTemplateResponseDTO> createTemplate(
        @Valid @RequestBody RecipeStepTemplateRequestDTO request
    ) {
        return ResponseEntity.ok(templateService.createTemplate(request));
    }

    /**
     * Updates an existing reusable preparation template.
     *
     * @param id Template ID to update
     * @param request Update request DTO
     * @return Updated template response DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    @Operation(summary = "Update step template (BARMAN/ADMIN/MANAGER)", description = "Updates an existing reusable preparation action template.")
    @ApiResponse(responseCode = "200", description = "Template updated successfully")
    @ApiResponse(responseCode = "404", description = "Template not found")
    public ResponseEntity<RecipeStepTemplateResponseDTO> updateTemplate(
        @Parameter(description = "Template ID") @PathVariable Long id,
        @Valid @RequestBody RecipeStepTemplateRequestDTO request
    ) {
        return ResponseEntity.ok(templateService.updateTemplate(id, request));
    }

    /**
     * Deletes a reusable template.
     *
     * @param id Template ID to delete
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Delete step template (ADMIN/MANAGER)", description = "Deletes a custom preparation step template (predefined templates cannot be deleted).")
    @ApiResponse(responseCode = "204", description = "Template deleted successfully")
    @ApiResponse(responseCode = "400", description = "Cannot delete predefined template")
    @ApiResponse(responseCode = "404", description = "Template not found")
    public ResponseEntity<Void> deleteTemplate(
        @Parameter(description = "Template ID") @PathVariable Long id
    ) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
