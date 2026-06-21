package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitEgalRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.FactureService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/factures")
@CrossOrigin(origins = "*")
public class FactureController {
    private final FactureService factureService;

    @Autowired
    public FactureController(FactureService factureService) {
        this.factureService = factureService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<List<FactureResponseDTO>> getAllFactures() {
        return ResponseEntity.ok(factureService.getAllFactures().stream()
            .map(FactureResponseDTO::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<FactureResponseDTO> createFacture(@Valid @RequestBody Facture facture) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.createFacture(facture)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<FactureResponseDTO> updateFacture(@PathVariable Long id, @Valid @RequestBody Facture factureDetails) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.updateFacture(id, factureDetails)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFacture(@PathVariable Long id) {
        factureService.deleteFacture(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<FactureResponseDTO> getFactureById(@PathVariable Long id) {
        return factureService.getFactureById(id)
            .map(FactureResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/table/{tableId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByTable(@PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(factureService.getFacturesByTable(table).stream()
            .map(FactureResponseDTO::from).toList());
    }

    @GetMapping("/date")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(factureService.getFacturesByDate(debut, fin).stream()
            .map(FactureResponseDTO::from).toList());
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<FactureResponseDTO> ajouterItem(@PathVariable Long id, @Valid @RequestBody FactureItem item) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.ajouterItem(id, item)));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<FactureResponseDTO> retirerItem(@PathVariable Long id, @PathVariable Long itemId) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.retirerItem(id, itemId)));
    }

    @PostMapping("/{id}/regler")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<FactureResponseDTO> reglerFacture(@PathVariable Long id, @RequestParam String modePaiement) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.reglerFacture(id, modePaiement)));
    }

    @PostMapping("/{id}/split/egal")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<List<SplitResultDTO>> splitEgal(
            @PathVariable Long id,
            @RequestBody SplitEgalRequest request) {
        return ResponseEntity.ok(factureService.splitEgal(id, request.nombreConvives()));
    }

    @PostMapping("/{id}/split/selection")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    public ResponseEntity<List<SplitResultDTO>> splitParSelection(
            @PathVariable Long id,
            @RequestBody SplitAdditionRequest request) {
        return ResponseEntity.ok(factureService.splitParSelection(id, request));
    }
}
