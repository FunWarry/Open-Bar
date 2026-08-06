package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.service.SampleDataSeederService;
import com.bar.gestioncocktail.service.SetupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

/**
 * Controller REST gérant l'initialisation et le premier démarrage de
 * l'application (assistant d'installation et jeux de données de démonstration).
 */
@RestController
@RequestMapping("/api/setup")
@Tag(name = "Setup", description = "Initialisation du système, création du compte administrateur initial et jeux de test")
public class SetupController {

    private final SetupService setupService;
    private final Optional<SampleDataSeederService> sampleDataSeederService;

    /**
     * Constructeur avec injection du service d'initialisation et seeder optionnel.
     *
     * @param setupService Le service gérant la configuration initiale
     * @param sampleDataSeederService Le service optionnel de génération des données de démonstration
     */
    public SetupController(SetupService setupService, Optional<SampleDataSeederService> sampleDataSeederService) {
        this.setupService = setupService;
        this.sampleDataSeederService = sampleDataSeederService;
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

    /**
     * Génère un jeu de données complet de démonstration (Utilisateurs, Zones, Tables, Commandes, Factures, Retards).
     *
     * @return Message de confirmation de génération des données de test
     */
    @PostMapping("/seed-demo")
    @Operation(summary = "Générer le jeu de données de test complet", description = "Popule la base avec des tables, serveurs, commandes actives/retardées et factures.")
    @ApiResponse(responseCode = "200", description = "Jeu de données de démonstration généré avec succès")
    public ResponseEntity<Map<String, String>> seedDemoData() {
        if (sampleDataSeederService.isPresent()) {
            sampleDataSeederService.get().seedAllDemoData();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Jeu de données de test (tables, serveurs, commandes actives & retardées, factures) généré avec succès."
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "status", "skipped",
                    "message", "Le seeder de données de démonstration est désactivé en environnement de production."
            ));
        }
    }
}
