package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.service.AppSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller REST pour la gestion des paramètres globaux de l'application (personnalisation, branding, etc.).
 * <p>
 * L'endpoint {@code GET} est public afin de permettre la lecture des paramètres dès l'écran de connexion.
 * L'endpoint {@code PUT} est réservé aux administrateurs.
 */
@RestController
@RequestMapping("/api/settings")
@Tag(name = "Settings", description = "Paramètres de personnalisation globale de l'établissement")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    /**
     * Constructeur avec injection du service de paramètres.
     *
     * @param appSettingsService Le service gérant les paramètres d'application
     */
    @Autowired
    public AppSettingsController(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    /**
     * Récupère les paramètres actuels de l'application.
     *
     * @return Les paramètres de l'établissement au format DTO
     */
    @GetMapping
    @Operation(summary = "Obtenir les paramètres de l'établissement", description = "Accès public permettant d'afficher le nom et le logo de l'établissement dès la page de login.")
    @ApiResponse(responseCode = "200", description = "Paramètres récupérés avec succès")
    public ResponseEntity<AppSettingsResponseDTO> getSettings() {
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.getSettings()));
    }

    /**
     * Met à jour les paramètres de l'établissement.
     *
     * @param request Les nouveaux paramètres à appliquer
     * @return Les paramètres mis à jour
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour les paramètres (ADMIN)", description = "Permet d'adapter le nom de l'établissement, l'adresse, le SIRET et les taux de TVA.")
    @ApiResponse(responseCode = "200", description = "Paramètres mis à jour")
    @ApiResponse(responseCode = "403", description = "Accès refusé - Rôle ADMIN requis")
    public ResponseEntity<AppSettingsResponseDTO> updateSettings(@Valid @RequestBody AppSettingsUpdateRequest request) {
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.updateSettings(request)));
    }
}
