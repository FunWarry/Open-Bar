package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.dto.TableSessionValidateRequestDTO;
import com.bar.gestioncocktail.service.TableSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public REST controller for validating and managing ephemeral table sessions in client QR ordering.
 * <p>
 * Accessible anonymously by patrons to verify that their scanned QR code corresponds to an active,
 * authorized dining session before placing orders.
 */
@RestController
@RequestMapping("/api/public/tables/{tableId:\\d+}/session")
@Tag(name = "Public Table Sessions", description = "Ephemeral table session tokens for anti-fraud QR code validation")
public class PublicTableSessionController {

    private final TableSessionService tableSessionService;

    /**
     * Constructs the controller with the table session service dependency.
     *
     * @param tableSessionService Service managing ephemeral table session logic
     */
    public PublicTableSessionController(TableSessionService tableSessionService) {
        this.tableSessionService = tableSessionService;
    }

    /**
     * Validates an ephemeral table session token or checks active status for the table via GET.
     *
     * @param tableId Table identifier
     * @param token Optional session token to validate
     * @return Table session state and validity DTO
     */
    @GetMapping
    @Operation(summary = "Validate table session token", description = "Checks whether an ephemeral token is active, valid, and not expired for the given table.")
    @ApiResponse(responseCode = "200", description = "Session validation evaluated successfully")
    public ResponseEntity<TableSessionResponseDTO> getSession(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Ephemeral session token", example = "4e389d44-0b1e-451e-b83b-9e236ceb348d")
            @RequestParam(required = false) String token) {
        TableSessionResponseDTO response = tableSessionService.validateSession(tableId, token);
        return ResponseEntity.ok(response);
    }

    /**
     * Validates an ephemeral table session token via POST request payload.
     *
     * @param tableId Table identifier
     * @param requestDTO Optional request containing session token
     * @return Table session state and validity DTO
     */
    @PostMapping("/validate")
    @Operation(summary = "Validate table session token via POST payload", description = "Validates submitted session token against active establishment session policies.")
    @ApiResponse(responseCode = "200", description = "Session validation evaluated successfully")
    public ResponseEntity<TableSessionResponseDTO> validateSession(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Valid @RequestBody(required = false) TableSessionValidateRequestDTO requestDTO) {
        String token = requestDTO != null ? requestDTO.sessionToken() : null;
        TableSessionResponseDTO response = tableSessionService.validateSession(tableId, token);
        return ResponseEntity.ok(response);
    }

    /**
     * Refreshes or requests a new active table session for an occupied table.
     *
     * @param tableId Table identifier
     * @return Fresh active table session DTO
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh or obtain active table session", description = "Obtains an active ephemeral session for an on-premise table.")
    @ApiResponse(responseCode = "200", description = "Table session refreshed successfully")
    public ResponseEntity<TableSessionResponseDTO> refreshSession(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId) {
        TableSessionResponseDTO response = tableSessionService.refreshSession(tableId);
        return ResponseEntity.ok(response);
    }
}
