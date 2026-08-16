package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Response DTO representing an order with its item lines and lifecycle timestamps.
 *
 * @param id Unique order identifier
 * @param tableId Identifier of attached table
 * @param tableNumero Human-readable table number
 * @param serveurId Server user ID
 * @param serveurUsername Server username
 * @param items List of ordered item lines
 * @param statut Current order status
 * @param notes Special preparation notes
 * @param total Total order amount
 * @param pourboire Tip amount
 * @param dateCommande Order placement timestamp
 * @param datePreparation Preparation start timestamp (Bartender)
 * @param dateLivraison Delivery timestamp
 * @param dateReglement Settlement timestamp
 * @param createdAt Database creation timestamp
 * @param updatedAt Last modification timestamp
 */
@Schema(description = "DTO representation of an order")
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
    /**
     * Converts a {@link Commande} entity into a response DTO.
     *
     * @param c Order entity
     * @return Corresponding response DTO
     */
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
