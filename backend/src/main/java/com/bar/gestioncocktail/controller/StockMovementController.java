package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.StockMovementResponseDTO;
import com.bar.gestioncocktail.dto.StockWasteRequestDTO;
import com.bar.gestioncocktail.dto.StockWasteSummaryDTO;
import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller managing stock shrinkage declarations, inventory waste audits, and financial loss metrics.
 */
@RestController
@RequestMapping("/api/stock")
@Tag(name = "Stock Movements", description = "Stock shrinkage, breakage, and waste management endpoints")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    /**
     * Constructs the stock movement controller with service dependency.
     *
     * @param stockMovementService Service managing stock shrinkage business logic
     */
    public StockMovementController(StockMovementService stockMovementService) {
        this.stockMovementService = stockMovementService;
    }

    /**
     * Records an ingredient waste, breakage, expiration, or complimentary shrinkage event.
     * Immediately deducts active inventory balance, registers an audit log, and notifies of low stock if applicable.
     *
     * @param request Validated waste declaration request payload
     * @param authentication Current user authentication context
     * @param servletRequest HTTP servlet request for client IP resolution
     * @return DTO representation of the persisted stock movement
     */
    @PostMapping("/waste")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Record stock waste / shrinkage (ADMIN/MANAGER/BARMAN)",
            description = "Records a broken bottle, expired product, tasting, or complimentary drink loss, immediately deducting inventory stock."
    )
    @ApiResponse(responseCode = "201", description = "Stock waste recorded and inventory deducted successfully")
    @ApiResponse(responseCode = "400", description = "Invalid payload or declared waste exceeds inventory stock")
    @ApiResponse(responseCode = "404", description = "Ingredient not found")
    public ResponseEntity<StockMovementResponseDTO> recordWaste(
            @Valid @RequestBody StockWasteRequestDTO request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        String username = authentication != null ? authentication.getName() : null;
        String ipAddress = servletRequest != null ? servletRequest.getRemoteAddr() : null;

        StockMovement saved = stockMovementService.recordWaste(request, username, ipAddress);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(StockMovementResponseDTO.from(saved));
    }

    /**
     * Retrieves recorded stock shrinkage movements, optionally filtered by ingredient.
     *
     * @param ingredientId Optional filter for a specific ingredient
     * @return List of matching stock movement response DTOs
     */
    @GetMapping("/movements")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "List all stock movements (ADMIN/MANAGER/BARMAN)",
            description = "Retrieves all recorded stock movements ordered chronologically descending."
    )
    @ApiResponse(responseCode = "200", description = "List of stock movements retrieved")
    public ResponseEntity<List<StockMovementResponseDTO>> getMovements(
            @Parameter(description = "Optional ingredient ID filter") @RequestParam(required = false) Long ingredientId) {
        List<StockMovement> movements = (ingredientId != null)
                ? stockMovementService.getMovementsByIngredient(ingredientId)
                : stockMovementService.getAllMovements();

        List<StockMovementResponseDTO> dtos = movements.stream()
                .map(StockMovementResponseDTO::from)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Retrieves aggregated stock shrinkage metrics and breakdown by reason.
     *
     * @return Summary metrics containing total loss, total items, and reasons breakdown
     */
    @GetMapping("/waste/summary")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('BARMAN')")
    @Operation(
            summary = "Get stock waste metrics summary (ADMIN/MANAGER/BARMAN)",
            description = "Aggregates total shrinkage financial loss, item count, and breakdown by declared reason."
    )
    @ApiResponse(responseCode = "200", description = "Waste summary metrics retrieved")
    public ResponseEntity<StockWasteSummaryDTO> getWasteSummary() {
        return ResponseEntity.ok(stockMovementService.getWasteSummary());
    }
}
