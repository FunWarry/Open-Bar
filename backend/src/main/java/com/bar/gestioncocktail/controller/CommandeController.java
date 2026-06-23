package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.CommandeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/commandes")
@CrossOrigin(origins = "*")
public class CommandeController {
    private final CommandeService commandeService;

    public CommandeController(CommandeService commandeService) {
        this.commandeService = commandeService;
    }

    @PostMapping
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    public ResponseEntity<CommandeResponseDTO> createCommande(@Valid @RequestBody Commande commande) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.createCommande(commande)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    public ResponseEntity<CommandeResponseDTO> updateCommande(@PathVariable Long id, @Valid @RequestBody Commande commandeDetails) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.updateCommande(id, commandeDetails)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCommande(@PathVariable Long id) {
        commandeService.deleteCommande(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CommandeResponseDTO> getCommandeById(@PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(CommandeResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/table/{tableId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByTable(@PathVariable Long tableId) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTable(table).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    @GetMapping("/serveur/{serveurId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByServeur(@PathVariable Long serveurId) {
        User serveur = new User();
        serveur.setId(serveurId);
        return ResponseEntity.ok(commandeService.getCommandesByServeur(serveur).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    @GetMapping("/statut/{statut}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByStatut(@PathVariable CommandeStatut statut) {
        return ResponseEntity.ok(commandeService.getCommandesByStatut(statut).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    @GetMapping("/table/{tableId}/statut/{statut}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByTableAndStatut(
        @PathVariable Long tableId,
        @PathVariable CommandeStatut statut) {
        TableEntity table = new TableEntity();
        table.setId(tableId);
        return ResponseEntity.ok(commandeService.getCommandesByTableAndStatut(table, statut).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    @GetMapping("/date")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CommandeResponseDTO>> getCommandesByDate(
        @RequestParam LocalDateTime debut,
        @RequestParam LocalDateTime fin) {
        return ResponseEntity.ok(commandeService.getCommandesByDate(debut, fin).stream()
            .map(CommandeResponseDTO::from).toList());
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    public ResponseEntity<CommandeResponseDTO> ajouterItem(@PathVariable Long id, @Valid @RequestBody CommandeItem item) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.ajouterItem(id, item)));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN')")
    public ResponseEntity<CommandeResponseDTO> retirerItem(@PathVariable Long id, @PathVariable Long itemId) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.retirerItem(id, itemId)));
    }

    @PutMapping("/{id}/statut")
    @PreAuthorize("hasRole('BARMAN') or hasRole('SERVEUR')")
    public ResponseEntity<CommandeResponseDTO> changerStatut(@PathVariable Long id, @RequestBody CommandeStatut nouveauStatut) {
        return ResponseEntity.ok(CommandeResponseDTO.from(commandeService.changerStatut(id, nouveauStatut)));
    }

    @PutMapping("/{id}/annuler")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('MANAGER')")
    public ResponseEntity<CommandeResponseDTO> annulerCommande(@PathVariable Long id) {
        return commandeService.getCommandeById(id)
            .map(commande -> {
                commandeService.annulerCommande(commande);
                return ResponseEntity.ok(CommandeResponseDTO.from(commande));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/items/{itemId}/priorite")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('BARMAN')")
    public ResponseEntity<Void> definirPriorite(@PathVariable Long itemId, @RequestParam boolean prioritaire) {
        CommandeItem item = new CommandeItem();
        item.setId(itemId);
        commandeService.definirPriorite(item, prioritaire);
        return ResponseEntity.ok().build();
    }
}
