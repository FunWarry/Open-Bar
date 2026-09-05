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
 * @param prioritaire Priority/urgent status flag
 * @param dateCommande Order placement timestamp
 * @param datePreparation Preparation start timestamp (Bartender)
 * @param datePret Order ready for delivery timestamp (Bartender ready)
 * @param dateLivraison Delivery timestamp (Server served to table)
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
    boolean prioritaire,
    LocalDateTime dateCommande,
    LocalDateTime datePreparation,
    LocalDateTime datePret,
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
        List<CommandeItemResponseDTO> items = extractItems(c);

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

        BigDecimal total = computeTotalFallback(c.getTotal(), items);
        boolean isPrioritaire = computeIsPrioritaire(c.isPrioritaire(), items);

        return new CommandeResponseDTO(
            c.getId(),
            tableId,
            tableNumero,
            serveurId,
            serveurUsername,
            items,
            c.getStatut(),
            c.getNotes(),
            total != null ? total : BigDecimal.ZERO,
            c.getPourboire(),
            isPrioritaire,
            c.getDateCommande(),
            c.getDatePreparation(),
            c.getDatePret(),
            c.getDateLivraison(),
            c.getDateReglement(),
            c.getCreatedAt(),
            c.getUpdatedAt()
        );
    }

    private static List<CommandeItemResponseDTO> extractItems(Commande c) {
        try {
            if (c.getItems() != null) {
                return c.getItems().stream().map(CommandeItemResponseDTO::from).toList();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }
        return Collections.emptyList();
    }

    private static BigDecimal computeTotalFallback(BigDecimal total, List<CommandeItemResponseDTO> items) {
        if ((total == null || total.compareTo(BigDecimal.ZERO) == 0) && items != null && !items.isEmpty()) {
            BigDecimal computedTotal = BigDecimal.ZERO;
            for (CommandeItemResponseDTO item : items) {
                if (item != null && item.prixUnitaire() != null) {
                    computedTotal = computedTotal.add(item.prixUnitaire().multiply(BigDecimal.valueOf(item.quantite())));
                }
            }
            return computedTotal;
        }
        return total;
    }

    private static boolean computeIsPrioritaire(boolean isPrioritaire, List<CommandeItemResponseDTO> items) {
        if (!isPrioritaire && items != null) {
            for (CommandeItemResponseDTO item : items) {
                if (item != null && item.prioritaire()) {
                    return true;
                }
            }
        }
        return isPrioritaire;
    }
}
