package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record CommandeResponseDTO(
    Long id,
    Long tableId,
    Integer tableNumero,
    Long serveurId,
    String serveurUsername,
    List<CommandeItemResponseDTO> items,
    CommandeStatut statut,
    String notes,
    BigDecimal total,
    BigDecimal pourboire,
    LocalDateTime dateCommande,
    LocalDateTime datePreparation,
    LocalDateTime dateLivraison,
    LocalDateTime dateReglement,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static CommandeResponseDTO from(Commande c) {
        List<CommandeItemResponseDTO> items = c.getItems() != null
            ? c.getItems().stream().map(CommandeItemResponseDTO::from).toList()
            : Collections.emptyList();
        return new CommandeResponseDTO(
            c.getId(),
            c.getTable() != null ? c.getTable().getId() : null,
            c.getTable() != null ? c.getTable().getNumero() : null,
            c.getServeur() != null ? c.getServeur().getId() : null,
            c.getServeur() != null ? c.getServeur().getUsername() : null,
            items,
            c.getStatut(),
            c.getNotes(),
            c.getTotal(),
            c.getPourboire(),
            c.getDateCommande(),
            c.getDatePreparation(),
            c.getDateLivraison(),
            c.getDateReglement(),
            c.getCreatedAt(),
            c.getUpdatedAt()
        );
    }
}
