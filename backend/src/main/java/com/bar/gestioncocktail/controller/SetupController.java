package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.service.SetupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller REST gérant l'initialisation et le premier démarrage de l'application (assistant d'installation).
 */
@RestController
@RequestMapping("/api/setup")
@CrossOrigin(origins = "*")
@Tag(name = "Setup", description = "Initialisation du système et création du compte administrateur initial")
public class SetupController {

    private final SetupService setupService;

    /**
     * Constructeur avec injection du service d'initialisation.
     *
     * @param setupService Le service gérant la configuration initiale
     */
    public SetupController(SetupService setupService) {
        this.setupService = setupService;
    }

    /**
     * Indique si l'application a déjà été configurée (présence d'un compte admin).
     *
     * @return DTO indiquant si le setup est requis
     */
    @GetMapping("/status")
    @Operation(summary = "Vérifier le statut d'initialisation de l'application", description = "Retourne true si un administrateur existe déjà.")
    @ApiResponse(responseCode = "200", description = "Statut de configuration retourné")
    public ResponseEntity<SetupStatusDTO> getStatus() {
        return ResponseEntity.ok(setupService.getSetupStatus());
    }

    /**
     * Crée le compte administrateur initial au premier lancement.
     *
     * @param request Identifiants et informations du compte admin à créer
     * @return DTO de l'utilisateur administrateur créé
     */
    @PostMapping("/admin")
    @Operation(summary = "Créer le premier administrateur", description = "Désactivé dès qu'un administrateur existe déjà.")
    @ApiResponse(responseCode = "200", description = "Compte administrateur créé avec succès")
    @ApiResponse(responseCode = "400", description = "Un administrateur existe déjà ou données invalides")
    public ResponseEntity<UserResponseDTO> createAdmin(@Valid @RequestBody CreateAdminRequestDTO request) {
        return ResponseEntity.ok(setupService.createInitialAdmin(request));
    }
}
