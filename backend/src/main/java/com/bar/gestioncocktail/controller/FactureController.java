package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.FactureItemRequestDTO;
import com.bar.gestioncocktail.dto.FactureRequestDTO;
import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.dto.MergeFacturesRequestDTO;
import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitEgalRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.service.FactureService;
import com.bar.gestioncocktail.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller REST pour la gestion de la facturation, des règlements, de la
 * division d'addition et de l'export PDF.
 */
@RestController
@RequestMapping("/api/factures")
@Tag(name = "Factures", description = "Gestion des factures, règlements, division d'addition (split), fusion et génération de tickets PDF")
public class FactureController {
    private final FactureService factureService;
    private final PdfService pdfService;

    /**
     * Constructeur avec injection des services de facturation et de génération PDF.
     *
     * @param factureService Service gérant les factures
     * @param pdfService     Service d'export PDF
     */
    @Autowired
    public FactureController(FactureService factureService, PdfService pdfService) {
        this.factureService = factureService;
        this.pdfService = pdfService;
    }

    /**
     * Liste toutes les factures.
     *
     * @return Liste des factures enregistrées
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Lister toutes les factures (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Factures récupérées")
    public ResponseEntity<List<FactureResponseDTO>> getAllFactures() {
        return ResponseEntity.ok(factureService.getAllFactures().stream()
                .map(FactureResponseDTO::from).toList());
    }

    /**
     * Création d'une nouvelle facture.
     *
     * @param facture Données de la facture à créer
     * @return DTO de la facture créée
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Créer une facture (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Facture créée avec succès")
    public ResponseEntity<FactureResponseDTO> createFacture(@Valid @RequestBody FactureRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.createFacture(request.toEntity())));
    }

    /**
     * Met à jour une facture existante.
     *
     * @param id      Identifiant de la facture
     * @param request Données modifiées
     * @return DTO mis à jour
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Mettre à jour une facture (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Facture mise à jour")
    public ResponseEntity<FactureResponseDTO> updateFacture(
            @Parameter(description = "ID de la facture") @PathVariable Long id,
            @Valid @RequestBody FactureRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.updateFacture(id, request.toEntity())));
    }

    /**
     * Supprime une facture.
     *
     * @param id Identifiant de la facture
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer une facture (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Facture supprimée")
    public ResponseEntity<Void> deleteFacture(@Parameter(description = "ID de la facture") @PathVariable Long id) {
        factureService.deleteFacture(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Obtient une facture par son identifiant.
     *
     * @param id Identifiant de la facture
     * @return DTO de la facture
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Obtenir une facture par son ID")
    @ApiResponse(responseCode = "200", description = "Facture trouvée")
    @ApiResponse(responseCode = "404", description = "Facture non trouvée")
    public ResponseEntity<FactureResponseDTO> getFactureById(
            @Parameter(description = "ID de la facture") @PathVariable Long id) {
        return factureService.getFactureById(id)
                .map(FactureResponseDTO::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtient les factures rattachées à une table.
     *
     * @param tableId Identifiant de la table
     * @return Liste des factures
     */
    @GetMapping("/table/{tableId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Lister les factures d'une table")
    @ApiResponse(responseCode = "200", description = "Factures de la table récupérées")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByTable(
            @Parameter(description = "ID de la table") @PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(factureService.getFacturesByTable(table).stream()
                .map(FactureResponseDTO::from).toList());
    }

    /**
     * Filtre les factures sur une plage de dates.
     *
     * @param debut Date et heure de début
     * @param fin   Date et heure de fin
     * @return Liste des factures correspondantes
     */
    @GetMapping("/date")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Lister les factures par plage de dates")
    @ApiResponse(responseCode = "200", description = "Factures récupérées")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByDate(
            @RequestParam LocalDateTime debut,
            @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(factureService.getFacturesByDate(debut, fin).stream()
                .map(FactureResponseDTO::from).toList());
    }

    /**
     * Ajoute une ligne d'article à une facture.
     *
     * @param id      Identifiant de la facture
     * @param request Ligne d'article
     * @return Facture mise à jour
     */
    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Ajouter une ligne à une facture")
    @ApiResponse(responseCode = "200", description = "Ligne ajoutée")
    public ResponseEntity<FactureResponseDTO> ajouterItem(
            @Parameter(description = "ID de la facture") @PathVariable Long id,
            @Valid @RequestBody FactureItemRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.ajouterItem(id, request.toEntity())));
    }

    /**
     * Retire une ligne d'article d'une facture.
     *
     * @param id     Identifiant de la facture
     * @param itemId Identifiant de la ligne d'article
     * @return Facture mise à jour
     */
    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Retirer une ligne d'une facture")
    @ApiResponse(responseCode = "200", description = "Ligne retirée")
    public ResponseEntity<FactureResponseDTO> retirerItem(
            @Parameter(description = "ID de la facture") @PathVariable Long id,
            @Parameter(description = "ID du facture item") @PathVariable Long itemId) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.retirerItem(id, itemId)));
    }

    /**
     * Valide le règlement d'une facture avec enregistrement du mode de paiement.
     *
     * @param id           Identifiant de la facture
     * @param modePaiement Mode de paiement (ex: CARTE, ESPECES, TICKETS_RESTO)
     * @return Facture réglée
     */
    @PostMapping("/{id}/regler")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Enregistrer le règlement d'une facture", description = "Marque la facture comme réglée et libère la table associée si pertinent.")
    @ApiResponse(responseCode = "200", description = "Règlement effectué")
    public ResponseEntity<FactureResponseDTO> reglerFacture(
            @Parameter(description = "ID de la facture") @PathVariable Long id,
            @Parameter(description = "Mode de paiement (CARTE, ESPECES, etc.)") @RequestParam String modePaiement) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.reglerFacture(id, modePaiement)));
    }

    /**
     * Génère et télécharge le ticket/facture au format PDF.
     *
     * @param id Identifiant de la facture
     * @return Fichier PDF binaire sous forme d'un tableau d'octets
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Télécharger la facture au format PDF", description = "Génère un document PDF aux normes légales (TVA, SIRET, numérotation).")
    @ApiResponse(responseCode = "200", description = "PDF généré")
    @ApiResponse(responseCode = "404", description = "Facture introuvable")
    public ResponseEntity<byte[]> downloadFacturePdf(
            @Parameter(description = "ID de la facture") @PathVariable Long id) {
        Facture facture = factureService.getFactureById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée: " + id));
        byte[] pdf = pdfService.generateFacturePdf(facture);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"facture-" + id + ".pdf\"")
                .body(pdf);
    }

    /**
     * Divise une facture à parts égales entre N convives.
     *
     * @param id      Identifiant de la facture
     * @param request DTO indiquant le nombre de convives
     * @return Résultats du calcul de répartition
     */
    @PostMapping("/{id}/split/egal")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Diviser l'addition à parts égales", description = "Calcule le sous-total par convive pour un partage équitable.")
    @ApiResponse(responseCode = "200", description = "Répartition calculée")
    public ResponseEntity<List<SplitResultDTO>> splitEgal(
            @PathVariable Long id,
            @RequestBody SplitEgalRequest request) {
        return ResponseEntity.ok(factureService.splitEgal(id, request.nombreConvives()));
    }

    /**
     * Divise une facture par sélection d'articles choisis par chaque convive.
     *
     * @param id      Identifiant de la facture
     * @param request DTO décrivant la répartition des articles par convive
     * @return Résultats détaillés de la répartition
     */
    @PostMapping("/{id}/split/selection")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Diviser l'addition par sélection d'articles", description = "Permet à chaque convive de régler des articles spécifiques.")
    @ApiResponse(responseCode = "200", description = "Répartition sur mesure calculée")
    public ResponseEntity<List<SplitResultDTO>> splitParSelection(
            @PathVariable Long id,
            @RequestBody SplitAdditionRequest request) {
        return ResponseEntity.ok(factureService.splitParSelection(id, request));
    }

    /**
     * Fusionne plusieurs factures en une seule facture regroupée.
     *
     * @param request DTO contenant la liste des IDs de factures à fusionner
     * @return La nouvelle facture fusionnée
     */
    @PostMapping("/merge")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Fusionner plusieurs factures en une seule", description = "Regroupe plusieurs sous-additions ou tables.")
    @ApiResponse(responseCode = "200", description = "Factures fusionnées")
    public ResponseEntity<FactureResponseDTO> fusionnerFactures(@Valid @RequestBody MergeFacturesRequestDTO request) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.fusionnerFactures(request)));
    }
}
