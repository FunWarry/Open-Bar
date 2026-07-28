package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * DTO de réponse représentant une commande avec ses lignes d'articles et son avancement temporel.
 *
 * @param id Identifiant unique de la commande
 * @param tableId Identifiant de la table rattachée
 * @param tableNumero Numéro lisible de la table
 * @param serveurId Identifiant du serveur référent
 * @param serveurUsername Nom d'utilisateur du serveur
 * @param items Liste des lignes d'articles commandés
 * @param statut Statut courant de la commande
 * @param notes Consignes particulières
 * @param total Montant total de la commande
 * @param pourboire Pourboire éventuel
 * @param dateCommande Timestamp de prise de commande
 * @param datePreparation Timestamp de début de préparation (Barman)
 * @param dateLivraison Timestamp de service/livraison
 * @param dateReglement Timestamp de paiement
 * @param createdAt Date de création en base
 * @param updatedAt Date de dernière modification
 */
@Schema(description = "Représentation DTO d'une commande")
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
     * Convertit une entité {@link Commande} en DTO de réponse.
     *
     * @param c L'entité commande
     * @return Le DTO correspondant
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
