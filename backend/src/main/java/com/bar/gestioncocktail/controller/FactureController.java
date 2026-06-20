package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.FactureService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public ResponseEntity<FactureResponseDTO> createFacture(@Valid @RequestBody Facture facture) {
        return ResponseEntity.ok(FactureResponseDTO.from(factureService.createFacture(facture)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FactureResponseDTO> updateFacture(@PathVariable Long id, @Valid @RequestBody Facture factureDetails) {
        try {
            return ResponseEntity.ok(FactureResponseDTO.from(factureService.updateFacture(id, factureDetails)));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFacture(@PathVariable Long id) {
        factureService.deleteFacture(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<FactureResponseDTO> getFactureById(@PathVariable Long id) {
        return factureService.getFactureById(id)
            .map(FactureResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/table/{tableId}")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByTable(@PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(factureService.getFacturesByTable(table).stream()
            .map(FactureResponseDTO::from).toList());
    }

    @GetMapping("/date")
    public ResponseEntity<List<FactureResponseDTO>> getFacturesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(factureService.getFacturesByDate(debut, fin).stream()
            .map(FactureResponseDTO::from).toList());
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<FactureResponseDTO> ajouterItem(@PathVariable Long id, @Valid @RequestBody FactureItem item) {
        try {
            return ResponseEntity.ok(FactureResponseDTO.from(factureService.ajouterItem(id, item)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<FactureResponseDTO> retirerItem(@PathVariable Long id, @PathVariable Long itemId) {
        try {
            return ResponseEntity.ok(FactureResponseDTO.from(factureService.retirerItem(id, itemId)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/regler")
    public ResponseEntity<FactureResponseDTO> reglerFacture(@PathVariable Long id, @RequestParam String modePaiement) {
        try {
            return ResponseEntity.ok(FactureResponseDTO.from(factureService.reglerFacture(id, modePaiement)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
