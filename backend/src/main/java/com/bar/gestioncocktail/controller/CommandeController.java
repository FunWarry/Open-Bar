package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.CommandeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/commandes")
@CrossOrigin(origins = "*")
public class CommandeController {
    private final CommandeService commandeService;

    @Autowired
    public CommandeController(CommandeService commandeService) {
        this.commandeService = commandeService;
    }

    @PostMapping
    public ResponseEntity<Commande> createCommande(@Valid @RequestBody Commande commande) {
        return ResponseEntity.ok(commandeService.createCommande(commande));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Commande> updateCommande(@PathVariable Long id, @Valid @RequestBody Commande commandeDetails) {
        try {
            Commande updatedCommande = commandeService.updateCommande(id, commandeDetails);
            return ResponseEntity.ok(updatedCommande);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCommande(@PathVariable Long id) {
        commandeService.deleteCommande(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Commande> getCommandeById(@PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/table/{tableId}")
    public ResponseEntity<List<Commande>> getCommandesByTable(@PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTable(table));
    }

    @GetMapping("/serveur/{serveurId}")
    public ResponseEntity<List<Commande>> getCommandesByServeur(@PathVariable Long serveurId) {
        User serveur = new User();
        serveur.setId(serveurId);
        return ResponseEntity.ok(commandeService.getCommandesByServeur(serveur));
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<Commande>> getCommandesByStatut(@PathVariable CommandeStatut statut) {
        return ResponseEntity.ok(commandeService.getCommandesByStatut(statut));
    }

    @GetMapping("/table/{tableId}/statut/{statut}")
    public ResponseEntity<List<Commande>> getCommandesByTableAndStatut(
        @PathVariable Long tableId,
        @PathVariable CommandeStatut statut) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTableAndStatut(table, statut));
    }

    @GetMapping("/date")
    public ResponseEntity<List<Commande>> getCommandesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(commandeService.getCommandesByDate(debut, fin));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<Commande> ajouterItem(@PathVariable Long id, @Valid @RequestBody CommandeItem item) {
        try {
            Commande commande = commandeService.ajouterItem(id, item);
            return ResponseEntity.ok(commande);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<Commande> retirerItem(@PathVariable Long id, @PathVariable Long itemId) {
        try {
            Commande commande = commandeService.retirerItem(id, itemId);
            return ResponseEntity.ok(commande);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/statut")
    public ResponseEntity<Commande> changerStatut(@PathVariable Long id, @RequestBody CommandeStatut nouveauStatut) {
        try {
            Commande commande = commandeService.changerStatut(id, nouveauStatut);
            return ResponseEntity.ok(commande);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/annuler")
    @PreAuthorize("hasRole('SERVEUR')")
    public ResponseEntity<Commande> annulerCommande(@PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(commande -> {
                commandeService.annulerCommande(commande);
                return ResponseEntity.ok(commande);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/items/{itemId}/priorite")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('BARMEN')")
    public ResponseEntity<Void> definirPriorite(@PathVariable Long itemId, @RequestParam boolean prioritaire) {
        CommandeItem item = new CommandeItem();
        item.setId(itemId);
        commandeService.definirPriorite(item, prioritaire);
        return ResponseEntity.ok().build();
    }
} 