package com.bar.gestioncocktail.controller;

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
 * Controller REST gérant le tableau de bord et les statistiques de supervision du bar.
 */
@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Statistiques d'activité, chiffres d'affaires et métriques temps réel pour les managers")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Constructeur avec injection du service de dashboard.
     *
     * @param dashboardService Le service de calcul des statistiques
     */
    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Calcule et retourne les métriques et statistiques globales de l'établissement.
     *
     * @return DTO contenant les chiffres d'affaires, nombre de commandes et tops cocktails
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Obtenir les statistiques du tableau de bord (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Statistiques calculées avec succès")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }
}
