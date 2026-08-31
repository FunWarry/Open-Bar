package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableAppelRequestDTO;
import com.bar.gestioncocktail.dto.TableAppelResponseDTO;
import com.bar.gestioncocktail.service.TableAppelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public REST controller allowing anonymous patrons to request server assistance or the bill
 * directly from their table via the QR code ordering interface.
 */
@RestController
@RequestMapping("/api/public/tables")
@Tag(name = "Public Table Alerts", description = "Anonymous patron assistance calls and bill requests from QR code ordering")
public class PublicTableAppelController {

    private final TableAppelService tableAppelService;

    /**
     * Constructs the controller with the table alert service dependency.
     *
     * @param tableAppelService Table alert service
     */
    public PublicTableAppelController(TableAppelService tableAppelService) {
        this.tableAppelService = tableAppelService;
    }

    /**
     * Triggers a waiter call or bill request alert for a table without requiring authentication.
     *
     * @param tableId Table identifier
     * @param requestDTO Alert request parameters (type, comment)
     * @return Created table alert response DTO
     */
    @PostMapping("/{tableId:\\d+}/appel")
    @Operation(summary = "Call server or request bill from table QR interface", description = "Creates a real-time assistance or bill request alert broadcasted to waitstaff.")
    @ApiResponse(responseCode = "201", description = "Alert registered and broadcasted successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request or cooldown rate limit active")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<TableAppelResponseDTO> appelerServeur(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Valid @RequestBody(required = false) TableAppelRequestDTO requestDTO) {
        TableAppelRequestDTO effectiveRequest = requestDTO != null ? requestDTO : new TableAppelRequestDTO();
        TableAppelResponseDTO response = tableAppelService.creerAppel(tableId, effectiveRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves active pending alerts for a specific table (useful for client interface polling / state restoration).
     *
     * @param tableId Table identifier
     * @return List of active alerts for the table
     */
    @GetMapping("/{tableId:\\d+}/appels/actifs")
    @Operation(summary = "Get active calls for a table", description = "Returns active pending alerts for the specified table.")
    @ApiResponse(responseCode = "200", description = "Active alerts retrieved")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<List<TableAppelResponseDTO>> getActiveAppelsPourTable(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId) {
        return ResponseEntity.ok(tableAppelService.getActiveAppelsPourTable(tableId));
    }
}
