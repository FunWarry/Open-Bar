package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.ChecklistCategory;
import com.bar.gestioncocktail.model.ChecklistRunStatus;
import com.bar.gestioncocktail.service.ChecklistService;
import com.bar.gestioncocktail.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * REST controller providing endpoints for operational checklist templates, SOP guidelines,
 * shift execution runs, item completion toggling, audit trails, and instructional media uploads.
 */
@Tag(name = "Checklists & Procedures", description = "Operational checklists, opening/closing SOPs, and execution audit trail")
@RestController
@RequestMapping("/api/checklists")
public class ChecklistController {

    private final ChecklistService checklistService;
    private final FileUploadService fileUploadService;

    /**
     * Constructs ChecklistController with required business and file upload services.
     *
     * @param checklistService  Service managing operational checklists
     * @param fileUploadService Service managing instructional media storage
     */
    public ChecklistController(ChecklistService checklistService, FileUploadService fileUploadService) {
        this.checklistService = checklistService;
        this.fileUploadService = fileUploadService;
    }

    /**
     * Retrieves all checklist templates.
     *
     * @param activeOnly Whether to filter only active templates (defaults to true)
     * @return List of checklist templates
     */
    @Operation(summary = "Get checklist templates", description = "Returns checklist templates available for execution.")
    @ApiResponse(responseCode = "200", description = "Templates retrieved successfully")
    @GetMapping("/templates")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChecklistTemplateDTO>> getTemplates(
            @Parameter(description = "Filter only active templates")
            @RequestParam(required = false, defaultValue = "true") Boolean activeOnly) {
        return ResponseEntity.ok(checklistService.getAllTemplates(activeOnly));
    }

    /**
     * Retrieves a checklist template by ID.
     *
     * @param id Template identifier
     * @return Template details
     */
    @Operation(summary = "Get template by ID", description = "Returns details and task steps of a specific checklist template.")
    @ApiResponse(responseCode = "200", description = "Template retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Template not found")
    @GetMapping("/templates/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChecklistTemplateDTO> getTemplateById(@PathVariable Long id) {
        return ResponseEntity.ok(checklistService.getTemplateById(id));
    }

    /**
     * Creates a new checklist template.
     *
     * @param request Creation payload
     * @return Newly created template
     */
    @Operation(summary = "Create checklist template", description = "Restricted to ADMIN and MANAGER. Creates a reusable operational checklist template.")
    @ApiResponse(responseCode = "201", description = "Template created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid payload or validation failure")
    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ChecklistTemplateDTO> createTemplate(@Valid @RequestBody CreateChecklistTemplateRequest request) {
        ChecklistTemplateDTO created = checklistService.createTemplate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing checklist template.
     *
     * @param id      Template identifier
     * @param request Update payload
     * @return Updated template details
     */
    @Operation(summary = "Update checklist template", description = "Restricted to ADMIN and MANAGER. Updates template parameters and steps.")
    @ApiResponse(responseCode = "200", description = "Template updated successfully")
    @ApiResponse(responseCode = "404", description = "Template not found")
    @PutMapping("/templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ChecklistTemplateDTO> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody UpdateChecklistTemplateRequest request) {
        return ResponseEntity.ok(checklistService.updateTemplate(id, request));
    }

    /**
     * Deactivates a checklist template.
     *
     * @param id Template identifier
     * @return No content
     */
    @Operation(summary = "Delete checklist template", description = "Restricted to ADMIN and MANAGER. Soft-deletes a checklist template.")
    @ApiResponse(responseCode = "204", description = "Template deleted successfully")
    @DeleteMapping("/templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        checklistService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieves all checklist execution runs matching optional category and status filters.
     *
     * @param category Optional category filter
     * @param status   Optional status filter
     * @return List of matching runs
     */
    @Operation(summary = "Get checklist runs", description = "Returns operational checklist execution runs matching optional category and status filters.")
    @ApiResponse(responseCode = "200", description = "Runs retrieved successfully")
    @GetMapping("/runs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChecklistRunDTO>> getRuns(
            @RequestParam(required = false) ChecklistCategory category,
            @RequestParam(required = false) ChecklistRunStatus status) {
        return ResponseEntity.ok(checklistService.getRunsHistory(null, category, status));
    }

    /**
     * Starts an interactive checklist execution run for a shift.
     *
     * @param request Run initiation payload
     * @param auth    Security authentication context
     * @return Newly started checklist run
     */
    @Operation(summary = "Start checklist run", description = "Instantiates a new execution session from a checklist template.")
    @ApiResponse(responseCode = "201", description = "Checklist run started successfully")
    @ApiResponse(responseCode = "404", description = "Template not found")
    @PostMapping("/runs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChecklistRunDTO> startRun(
            @Valid @RequestBody StartChecklistRunRequest request,
            Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        ChecklistRunDTO run = checklistService.startRun(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(run);
    }

    /**
     * Retrieves active checklist runs currently in progress.
     *
     * @return List of active runs
     */
    @Operation(summary = "Get active runs", description = "Returns checklist runs currently marked as IN_PROGRESS.")
    @ApiResponse(responseCode = "200", description = "Active runs retrieved successfully")
    @GetMapping("/runs/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChecklistRunDTO>> getActiveRuns() {
        return ResponseEntity.ok(checklistService.getActiveRuns());
    }

    /**
     * Retrieves historical checklist execution runs with optional filters.
     *
     * @param date     Optional filter by date
     * @param category Optional filter by category
     * @param status   Optional filter by status
     * @return List of matching historical runs
     */
    @Operation(summary = "Get runs history", description = "Returns historical checklist runs with date, category, and status filters.")
    @ApiResponse(responseCode = "200", description = "History retrieved successfully")
    @GetMapping("/runs/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChecklistRunDTO>> getRunsHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) ChecklistCategory category,
            @RequestParam(required = false) ChecklistRunStatus status) {
        return ResponseEntity.ok(checklistService.getRunsHistory(date, category, status));
    }

    /**
     * Retrieves details of a specific checklist run by ID.
     *
     * @param id Run identifier
     * @return Run details
     */
    @Operation(summary = "Get run by ID", description = "Returns details and task statuses of a specific checklist run.")
    @ApiResponse(responseCode = "200", description = "Run retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Run not found")
    @GetMapping("/runs/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChecklistRunDTO> getRunById(@PathVariable Long id) {
        return ResponseEntity.ok(checklistService.getRunById(id));
    }

    /**
     * Toggles the completion state of a task item within a checklist run.
     *
     * @param runId   Parent run ID
     * @param itemId  Task item ID
     * @param request Toggle request payload
     * @param auth    Security authentication context
     * @return Updated checklist run
     */
    @Operation(summary = "Toggle run task item", description = "Marks a task item as complete or incomplete, recording user and timestamp.")
    @ApiResponse(responseCode = "200", description = "Task item updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid run status or validation error")
    @ApiResponse(responseCode = "404", description = "Run or task item not found")
    @PutMapping("/runs/{runId}/items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChecklistRunDTO> toggleRunItem(
            @PathVariable Long runId,
            @PathVariable Long itemId,
            @RequestBody ToggleChecklistRunItemRequest request,
            Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(checklistService.toggleRunItem(runId, itemId, request, username));
    }

    /**
     * Finalizes and completes a checklist run session.
     *
     * @param id      Run identifier
     * @param request Completion request payload
     * @param auth    Security authentication context
     * @return Finalized checklist run
     */
    @Operation(summary = "Complete checklist run", description = "Finalizes an in-progress checklist run once mandatory items are fulfilled.")
    @ApiResponse(responseCode = "200", description = "Run completed successfully")
    @ApiResponse(responseCode = "400", description = "Mandatory tasks incomplete or invalid state")
    @ApiResponse(responseCode = "404", description = "Run not found")
    @PostMapping("/runs/{id}/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChecklistRunDTO> completeRun(
            @PathVariable Long id,
            @RequestBody(required = false) CompleteChecklistRunRequest request,
            Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(checklistService.completeRun(id, request, username));
    }

    /**
     * Cancels an in-progress checklist run.
     *
     * @param id   Run identifier
     * @param auth Security authentication context
     * @return Cancelled checklist run
     */
    @Operation(summary = "Cancel checklist run", description = "Restricted to ADMIN and MANAGER. Aborts an active checklist run.")
    @ApiResponse(responseCode = "200", description = "Run cancelled successfully")
    @ApiResponse(responseCode = "404", description = "Run not found")
    @PostMapping("/runs/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ChecklistRunDTO> cancelRun(
            @PathVariable Long id,
            Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(checklistService.cancelRun(id, username));
    }

    /**
     * Retrieves summary operational metrics for dashboards.
     *
     * @return Metrics summary DTO
     */
    @Operation(summary = "Get checklist statistics", description = "Returns active run count, daily completion rate, and template totals.")
    @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully")
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChecklistStatsDTO> getStats() {
        return ResponseEntity.ok(checklistService.getStats());
    }

    /**
     * Uploads an instructional image or video for checklist guides.
     *
     * @param file Uploaded media file
     * @return Map containing URL to stored media
     */
    @Operation(summary = "Upload checklist media", description = "Uploads an instructional image or video (MP4, WebM, PNG, JPEG, etc.)")
    @ApiResponse(responseCode = "200", description = "Media stored successfully")
    @ApiResponse(responseCode = "400", description = "Invalid file or size exceeded")
    @PostMapping({"/media", "/media/upload"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> uploadMedia(@RequestParam("file") MultipartFile file) {
        String url = fileUploadService.storeChecklistMedia(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
