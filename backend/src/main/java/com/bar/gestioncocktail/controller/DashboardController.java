package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.DashboardMarginAnalyticsDTO;
import com.bar.gestioncocktail.dto.DashboardStatsDTO;
import com.bar.gestioncocktail.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller managing the manager dashboard, live bar performance metrics, and financial margin analytics.
 */
@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Activity statistics, revenue analytics, COGS, and real-time operational metrics for managers")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Constructor with dependency injection.
     *
     * @param dashboardService The dashboard analytics computation service
     */
    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Computes and returns the overall operations metrics and financial statistics of the establishment.
     *
     * @return DTO containing revenues, active order counts, top cocktail sales, and financial health metrics
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get manager dashboard statistics (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Dashboard statistics computed successfully")
    @ApiResponse(responseCode = "403", description = "Access forbidden")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    /**
     * Computes and returns standalone financial health, COGS, and gross margin analytics for managers.
     *
     * @return DTO containing COGS, gross margins, and top profitable cocktails
     */
    @GetMapping("/margin-analytics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get manager dashboard gross margin and COGS analytics (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Margin analytics computed successfully")
    @ApiResponse(responseCode = "403", description = "Access forbidden")
    public ResponseEntity<DashboardMarginAnalyticsDTO> getMarginAnalytics() {
        return ResponseEntity.ok(dashboardService.getMarginAnalytics());
    }
}
