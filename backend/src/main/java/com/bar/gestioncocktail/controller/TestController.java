package com.bar.gestioncocktail.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller REST utilitaire pour les contrôles de santé (health check) et tests de connectivité.
 */
@RestController
@RequestMapping("/api/test")
@Tag(name = "Health Check & Test", description = "Vérification de l'état de santé du service backend")
public class TestController {

    /**
     * Endpoint public de contrôle de santé du backend.
     *
     * @return Message de confirmation du bon fonctionnement du service
     */
    @GetMapping("/health")
    @Operation(summary = "Contrôle de santé du serveur", description = "Accès public retournant un statut 200 OK si le serveur backend est opérationnel.")
    @ApiResponse(responseCode = "200", description = "Service opérationnel")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Service is up and running");
    }

    /**
     * Endpoint sécurisé de test.
     *
     * @return Message de confirmation
     */
    @GetMapping("/blocked")
    @Operation(summary = "Endpoint de test sécurisé", description = "Nécessite une authentification JWT.")
    @ApiResponse(responseCode = "200", description = "Accès accordé")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Test endpoint is blocking");
    }
}
