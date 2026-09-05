package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.service.PublicCommandeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public REST controller allowing customer orders via table QR code scans.
 * <p>
 * This endpoint requires no user authentication (accessible anonymously by patrons).
 * Upon creation, a UUID {@code trackingToken} is returned for real-time tracking.
 */
@RestController
@RequestMapping("/api/public/commandes")
@Tag(name = "Public QR Orders", description = "Anonymous client order intake via table QR code scans")
public class PublicCommandeController {

    private final PublicCommandeService publicCommandeService;

    /**
     * Constructs the controller with the public order service dependency.
     *
     * @param publicCommandeService Public order service
     */
    public PublicCommandeController(PublicCommandeService publicCommandeService) {
        this.publicCommandeService = publicCommandeService;
    }

    /**
     * Creates a public order from a QR code scan.
     *
     * @param requestDTO Ordered items and table identifier
     * @return Response containing order ID and anonymous tracking token
     */
    @PostMapping
    @Operation(summary = "Create a public order without authentication", description = "Validates stock, creates the order, and issues an anonymous tracking token.")
    @ApiResponse(responseCode = "201", description = "Public order created successfully")
    @ApiResponse(responseCode = "400", description = "Insufficient stock or invalid request data")
    public ResponseEntity<PublicCommandeResponseDTO> creerCommande(@Valid @RequestBody PublicCommandeRequestDTO requestDTO) {
        PublicCommandeResponseDTO response = publicCommandeService.creerCommandePublique(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves the status and progression of an order via its anonymous tracking token.
     *
     * @param trackingToken UUID tracking token issued during order creation
     * @return Current order status and details
     */
    @GetMapping("/{trackingToken}")
    @Operation(summary = "Track order progress via anonymous token", description = "Allows patrons to check the real-time progress of their order.")
    @ApiResponse(responseCode = "200", description = "Order status found")
    @ApiResponse(responseCode = "404", description = "Invalid tracking token")
    public ResponseEntity<PublicCommandeResponseDTO> getCommandeParTrackingToken(
        @Parameter(description = "Anonymous UUID tracking token") @PathVariable String trackingToken) {
        PublicCommandeResponseDTO response = publicCommandeService.getCommandeParTrackingToken(trackingToken);
        return ResponseEntity.ok(response);
    }
}
