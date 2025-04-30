package com.bar.gestioncocktail.controller;

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
@RequestMapping("/factures")
@CrossOrigin(origins = "*")
public class FactureController {
    private final FactureService factureService;

    @Autowired
    public FactureController(FactureService factureService) {
        this.factureService = factureService;
    }

    @PostMapping
    public ResponseEntity<Facture> createFacture(@Valid @RequestBody Facture facture) {
        return ResponseEntity.ok(factureService.createFacture(facture));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Facture> updateFacture(@PathVariable Long id, @Valid @RequestBody Facture factureDetails) {
        try {
            Facture updatedFacture = factureService.updateFacture(id, factureDetails);
            return ResponseEntity.ok(updatedFacture);
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
    public ResponseEntity<Facture> getFactureById(@PathVariable Long id) {
        return factureService.getFactureById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/table/{tableId}")
    public ResponseEntity<List<Facture>> getFacturesByTable(@PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(factureService.getFacturesByTable(table));
    }

    @GetMapping("/date")
    public ResponseEntity<List<Facture>> getFacturesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(factureService.getFacturesByDate(debut, fin));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<Facture> ajouterItem(@PathVariable Long id, @Valid @RequestBody FactureItem item) {
        try {
            Facture facture = factureService.ajouterItem(id, item);
            return ResponseEntity.ok(facture);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<Facture> retirerItem(@PathVariable Long id, @PathVariable Long itemId) {
        try {
            Facture facture = factureService.retirerItem(id, itemId);
            return ResponseEntity.ok(facture);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/regler")
    public ResponseEntity<Facture> reglerFacture(@PathVariable Long id, @RequestParam String modePaiement) {
        try {
            Facture facture = factureService.reglerFacture(id, modePaiement);
            return ResponseEntity.ok(facture);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
} 