package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.PreparationStation;
import java.math.BigDecimal;

/**
 * Response DTO representing an order item line.
 *
 * @param id Order item identifier
 * @param commandeId Parent order ID
 * @param cocktailId Cocktail ID
 * @param cocktailNom Cocktail name
 * @param varianteId Optional variant ID
 * @param varianteNom Optional variant name
 * @param quantite Quantity ordered
 * @param prixUnitaire Unit price at order time
 * @param notes Line-specific instructions
 * @param prioritaire Priority status flag
 * @param station Workstation responsible for preparation (BAR, KITCHEN, SNACK)
 * @param statut Item preparation status (EN_ATTENTE, EN_PREPARATION, PRET, etc.)
 */
public record CommandeItemResponseDTO(
    Long id,
    Long commandeId,
    Long cocktailId,
    String cocktailNom,
    Long varianteId,
    String varianteNom,
    int quantite,
    BigDecimal prixUnitaire,
    String notes,
    boolean prioritaire,
    PreparationStation station,
    CommandeStatut statut
) {
    /**
     * Backward-compatible 10-parameter constructor defaulting station to BAR and status to EN_ATTENTE.
     */
    public CommandeItemResponseDTO(
        Long id,
        Long commandeId,
        Long cocktailId,
        String cocktailNom,
        Long varianteId,
        String varianteNom,
        int quantite,
        BigDecimal prixUnitaire,
        String notes,
        boolean prioritaire
    ) {
        this(id, commandeId, cocktailId, cocktailNom, varianteId, varianteNom, quantite, prixUnitaire, notes, prioritaire, PreparationStation.BAR, CommandeStatut.EN_ATTENTE);
    }

    /**
     * Converts a {@link CommandeItem} entity into a response DTO.
     *
     * @param item Entity item
     * @return Corresponding DTO
     */
    public static CommandeItemResponseDTO from(CommandeItem item) {
        Long commandeId = null;
        try {
            if (item.getCommande() != null) {
                commandeId = item.getCommande().getId();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        Long cocktailId = null;
        String cocktailNom = null;
        PreparationStation cocktailStation = null;
        try {
            if (item.getCocktail() != null) {
                cocktailId = item.getCocktail().getId();
                cocktailNom = item.getCocktail().getNom();
                cocktailStation = item.getCocktail().getStation();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        Long varianteId = null;
        String varianteNom = null;
        try {
            if (item.getVariante() != null) {
                varianteId = item.getVariante().getId();
                varianteNom = item.getVariante().getNom();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        PreparationStation station = item.getStation() != null ? item.getStation() : cocktailStation;
        if (station == null) {
            station = PreparationStation.BAR;
        }

        CommandeStatut statut = item.getStatut() != null ? item.getStatut() : CommandeStatut.EN_ATTENTE;

        return new CommandeItemResponseDTO(
            item.getId(),
            commandeId,
            cocktailId,
            cocktailNom,
            varianteId,
            varianteNom,
            item.getQuantite(),
            item.getPrixUnitaire(),
            item.getNotes(),
            item.isPrioritaire(),
            station,
            statut
        );
    }
}
