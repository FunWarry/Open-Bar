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
        List<CommandeItemResponseDTO> items = Collections.emptyList();
        try {
            if (c.getItems() != null) {
                items = c.getItems().stream().map(CommandeItemResponseDTO::from).toList();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        Long tableId = null;
        Integer tableNumero = null;
        try {
            if (c.getTable() != null) {
                tableId = c.getTable().getId();
                tableNumero = c.getTable().getNumero();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        Long serveurId = null;
        String serveurUsername = null;
        try {
            if (c.getServeur() != null) {
                serveurId = c.getServeur().getId();
                serveurUsername = c.getServeur().getUsername();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        return new CommandeResponseDTO(
            c.getId(),
            tableId,
            tableNumero,
            serveurId,
            serveurUsername,
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
