package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableJoinApprovalRequestDTO;
import com.bar.gestioncocktail.dto.TableJoinRequestDTO;
import com.bar.gestioncocktail.dto.TableSessionResponseDTO;
import com.bar.gestioncocktail.dto.TableSessionValidateRequestDTO;
import com.bar.gestioncocktail.service.TableSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
     * @param guestSessionId Optional guest UUID for ownership verification
     * @param guestName Optional guest nickname
     * @return Table session state and validity DTO
     */
    @GetMapping
    @Operation(summary = "Validate table session token", description = "Checks whether an ephemeral token is active, valid, and not expired for the given table.")
    @ApiResponse(responseCode = "200", description = "Session validation evaluated successfully")
    public ResponseEntity<TableSessionResponseDTO> getSession(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Ephemeral session token", example = "4e389d44-0b1e-451e-b83b-9e236ceb348d")
            @RequestParam(required = false) String token,
            @Parameter(description = "Guest session UUID") @RequestParam(required = false) String guestSessionId,
            @Parameter(description = "Guest nickname") @RequestParam(required = false) String guestName) {
        TableSessionResponseDTO response = tableSessionService.validateSession(tableId, token, guestSessionId, guestName);
        return ResponseEntity.ok(response);
    }

    /**
     * Overload for test convenience and backward compatibility.
     *
     * @param tableId Table identifier
     * @param token Ephemeral session token
     * @return Table session state and validity DTO
     */
    public ResponseEntity<TableSessionResponseDTO> getSession(Long tableId, String token) {
        return getSession(tableId, token, null, null);
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

    /**
     * Generates a QR code image encoding the collaborative table ordering URL with active session token.
     *
     * @param tableId Table identifier or number
     * @param token Optional session token to embed
     * @param format Output format (PNG or SVG, defaults to PNG)
     * @param size Target width and height in pixels (defaults to 300)
     * @param baseUrl Optional patron browser origin URL
     * @return Binary image payload
     */
    @GetMapping("/qrcode")
    @Operation(summary = "Generate table session QR code", description = "Generates a QR code image encoding the collaborative dining order URL with session token.")
    @ApiResponse(responseCode = "200", description = "QR code image generated successfully")
    public ResponseEntity<byte[]> getSessionQrCode(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Ephemeral session token", example = "4e389d44-0b1e-451e-b83b-9e236ceb348d")
            @RequestParam(required = false) String token,
            @Parameter(description = "Image format (PNG or SVG)", example = "PNG")
            @RequestParam(defaultValue = "PNG") String format,
            @Parameter(description = "Image dimension in pixels", example = "300")
            @RequestParam(defaultValue = "300") int size,
            @Parameter(description = "Client base URL origin", example = "https://openbar.lan")
            @RequestParam(required = false) String baseUrl) {
        byte[] imageBytes = tableSessionService.generateSessionQrCode(tableId, token, format, size, baseUrl);
        String contentType = "SVG".equalsIgnoreCase(format) ? "image/svg+xml" : MediaType.IMAGE_PNG_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(imageBytes);
    }

    /**
     * Submits an access request to join an occupied table session.
     *
     * @param tableId Table identifier
     * @param dto Join request payload
     * @return Created join request DTO
     */
    @PostMapping("/join-request")
    @Operation(summary = "Submit table join request", description = "Submits a request by a new guest to join an occupied table session awaiting host approval.")
    @ApiResponse(responseCode = "200", description = "Join request created and broadcast to table owner")
    public ResponseEntity<TableJoinRequestDTO> submitJoinRequest(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Valid @RequestBody TableJoinRequestDTO dto) {
        TableJoinRequestDTO response = tableSessionService.createJoinRequest(tableId, dto);
        return ResponseEntity.ok(response);
    }

    /**
     * Responds to an applicant's table join request (accept or reject).
     *
     * @param tableId Table identifier
     * @param requestId Join request identifier
     * @param dto Approval action payload
     * @return Updated join request DTO
     */
    @PostMapping("/join-requests/{requestId:\\d+}/respond")
    @Operation(summary = "Respond to table join request", description = "Table host accepts or declines an applicant request to join the table.")
    @ApiResponse(responseCode = "200", description = "Join request evaluated and notified to applicant")
    public ResponseEntity<TableJoinRequestDTO> respondToJoinRequest(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Join request ID", example = "12") @PathVariable Long requestId,
            @Valid @RequestBody TableJoinApprovalRequestDTO dto) {
        TableJoinRequestDTO response = tableSessionService.respondToJoinRequest(tableId, requestId, dto);
        return ResponseEntity.ok(response);
    }

    /**
     * Queries current status of an applicant's join request.
     *
     * @param tableId Table identifier
     * @param applicantSessionId Applicant guest UUID
     * @return Join request status DTO with token if approved
     */
    @GetMapping("/join-requests/status")
    @Operation(summary = "Check join request status", description = "Checks whether an applicant's join request has been approved or rejected by the table owner.")
    @ApiResponse(responseCode = "200", description = "Join request status returned")
    public ResponseEntity<TableJoinRequestDTO> getJoinRequestStatus(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Applicant guest UUID") @RequestParam String applicantSessionId) {
        TableJoinRequestDTO response = tableSessionService.getJoinRequestStatus(tableId, applicantSessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves all pending join requests awaiting approval for the table owner.
     *
     * @param tableId Table identifier
     * @param ownerSessionId Table owner UUID
     * @return List of pending join requests
     */
    @GetMapping("/join-requests/pending")
    @Operation(summary = "List pending join requests", description = "Retrieves pending join requests for table host.")
    @ApiResponse(responseCode = "200", description = "Pending join requests list returned")
    public ResponseEntity<List<TableJoinRequestDTO>> getPendingJoinRequests(
            @Parameter(description = "Table ID", example = "5") @PathVariable Long tableId,
            @Parameter(description = "Owner session UUID") @RequestParam String ownerSessionId) {
        List<TableJoinRequestDTO> response = tableSessionService.getPendingJoinRequests(tableId, ownerSessionId);
        return ResponseEntity.ok(response);
    }
}
