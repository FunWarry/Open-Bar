package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableAppelResponseDTO;
import com.bar.gestioncocktail.service.TableAppelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for waitstaff and managers to supervise and acknowledge table assistance
 * and bill requests in real time.
 */
@RestController
@RequestMapping("/api/tables")
@Tag(name = "Table Calls & Alerts", description = "Waitstaff management of table assistance alerts and check requests")
public class TableAppelController {

    private final TableAppelService tableAppelService;

    /**
     * Constructs TableAppelController with required service dependency.
     *
     * @param tableAppelService Table alert service
     */
    public TableAppelController(TableAppelService tableAppelService) {
        this.tableAppelService = tableAppelService;
    }

    /**
     * Lists all currently active alerts awaiting staff attendance across the establishment.
     *
     * @return List of active table alert DTOs
     */
    @GetMapping("/appels/actifs")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all active table calls", description = "Retrieves all unacknowledged table alerts for waitstaff supervision.")
    @ApiResponse(responseCode = "200", description = "Active alerts retrieved")
    public List<TableAppelResponseDTO> getActiveAppels() {
        return tableAppelService.getActiveAppels();
    }

    /**
     * Lists active alerts for a specific table.
     *
     * @param tableId Table identifier
     * @return List of active alerts for the table
     */
    @GetMapping("/{tableId:\\d+}/appels")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get active calls for a table", description = "Retrieves active alerts for a specific table.")
    @ApiResponse(responseCode = "200", description = "Table alerts retrieved")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public List<TableAppelResponseDTO> getActiveAppelsForTable(
            @Parameter(description = "Table ID") @PathVariable Long tableId) {
        return tableAppelService.getActiveAppelsPourTable(tableId);
    }

    /**
     * Acknowledges / dismisses a specific table alert by staff.
     *
     * @param tableId Table identifier
     * @param id Alert identifier
     * @param authentication Current user authentication context
     * @return Updated table alert response DTO
     */
    @PostMapping("/{tableId:\\d+}/appels/{id:\\d+}/acquitter")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Acknowledge table alert (SERVEUR/MANAGER/ADMIN)", description = "Marks a table call as attended and clears active status.")
    @ApiResponse(responseCode = "200", description = "Alert acknowledged successfully")
    @ApiResponse(responseCode = "404", description = "Table or alert not found")
    public ResponseEntity<TableAppelResponseDTO> acquitterAppel(
            @Parameter(description = "Table ID") @PathVariable Long tableId,
            @Parameter(description = "Alert ID") @PathVariable Long id,
            Authentication authentication) {
        String staffUsername = authentication != null ? authentication.getName() : "Staff";
        return ResponseEntity.ok(tableAppelService.acquitterAppel(tableId, id, staffUsername));
    }

    /**
     * Acknowledges all active alerts for a table.
     *
     * @param tableId Table identifier
     * @param authentication Current user authentication context
     * @return List of acknowledged alert DTOs
     */
    @PostMapping("/{tableId:\\d+}/appels/acquitter-tous")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Acknowledge all alerts for a table (SERVEUR/MANAGER/ADMIN)", description = "Clears all active alerts for the table in one action.")
    @ApiResponse(responseCode = "200", description = "All alerts acknowledged")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<List<TableAppelResponseDTO>> acquitterTousAppels(
            @Parameter(description = "Table ID") @PathVariable Long tableId,
            Authentication authentication) {
        String staffUsername = authentication != null ? authentication.getName() : "Staff";
        return ResponseEntity.ok(tableAppelService.acquitterTousAppelsTable(tableId, staffUsername));
    }
}
