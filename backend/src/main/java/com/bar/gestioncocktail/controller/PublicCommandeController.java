package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.service.PublicCommandeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST public permettant la prise de commande par les clients via scan de QR code sur table.
 * <p>
 * Cet endpoint ne nécessite aucune authentification utilisateur (accessible anonymement par le client).
 * À la création de la commande, un {@code trackingToken} UUID est retourné pour le suivi temps réel.
 */
@RestController
@RequestMapping("/api/public/commandes")
@Tag(name = "Commandes Publiques QR Code", description = "Prise de commande anonyme par scan de QR code par le client final")
public class PublicCommandeController {

    private final PublicCommandeService publicCommandeService;

    /**
     * Constructeur avec injection du service de commande publique.
     *
     * @param publicCommandeService Le service de gestion des commandes publiques
     */
    @Autowired
    public PublicCommandeController(PublicCommandeService publicCommandeService) {
        this.publicCommandeService = publicCommandeService;
    }

    /**
     * Crée une commande publique à partir d'un scan QR code.
     *
     * @param requestDTO Les articles commandés et l'identifiant de la table
     * @return Réponse contenant l'ID de commande et le token de suivi anonyme
     */
    @PostMapping
    @Operation(summary = "Créer une commande publique sans authentification", description = "Valide le stock, crée la commande et émet le token anonyme de suivi.")
    @ApiResponse(responseCode = "201", description = "Commande publique enregistrée")
    @ApiResponse(responseCode = "400", description = "Stock insuffisant ou données invalides")
    public ResponseEntity<PublicCommandeResponseDTO> creerCommande(@Valid @RequestBody PublicCommandeRequestDTO requestDTO) {
        PublicCommandeResponseDTO response = publicCommandeService.creerCommandePublique(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Récupère le statut et l'avancement d'une commande via son token de suivi anonyme.
     *
     * @param trackingToken Token UUID de suivi généré à la commande
     * @return Statut courant de la commande
     */
    @GetMapping("/{trackingToken}")
    @Operation(summary = "Suivre l'avancement d'une commande par token anonyme", description = "Permet au client de consulter en direct l'avancement de sa commande.")
    @ApiResponse(responseCode = "200", description = "Commande et statut trouvés")
    @ApiResponse(responseCode = "404", description = "Token de suivi invalide")
    public ResponseEntity<PublicCommandeResponseDTO> getCommandeParTrackingToken(
        @Parameter(description = "Token UUID de suivi anonyme") @PathVariable String trackingToken) {
        PublicCommandeResponseDTO response = publicCommandeService.getCommandeParTrackingToken(trackingToken);
        return ResponseEntity.ok(response);
    }
}
