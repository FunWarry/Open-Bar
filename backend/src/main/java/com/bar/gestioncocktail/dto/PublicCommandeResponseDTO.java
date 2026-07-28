package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO de réponse pour la commande publique effectuée via scan de QR code.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Données de confirmation et de suivi d'une commande publique QR Code")
public class PublicCommandeResponseDTO {
    @Schema(description = "ID unique de la commande")
    private Long commandeId;

    @Schema(description = "Token UUID de suivi anonyme")
    private String trackingToken;

    @Schema(description = "ID de la table")
    private Long tableId;

    @Schema(description = "Numéro de la table")
    private String tableNumero;

    @Schema(description = "Montant total de la commande")
    private BigDecimal total;

    @Schema(description = "Statut actuel de la commande")
    private CommandeStatut statut;

    @Schema(description = "Date et heure de la commande")
    private LocalDateTime dateCreation;

    @Schema(description = "Temps d'attente estimé en minutes")
    private Integer tempsEstimeMinutes;

    @Schema(description = "Remarques ou consignes particulières")
    private String notes;

    @Schema(description = "Liste des articles commandés")
    private List<CommandeItemResponseDTO> items;

    /**
     * Crée un {@link PublicCommandeResponseDTO} depuis une entité {@link Commande}.
     *
     * @param commande La commande source
     * @param tempsEstimeMinutes Le temps de préparation estimé
     * @return Le DTO construit
     */
    public static PublicCommandeResponseDTO from(Commande commande, Integer tempsEstimeMinutes) {
        List<CommandeItemResponseDTO> itemDTOs = commande.getItems() != null
                ? commande.getItems().stream().map(CommandeItemResponseDTO::from).toList()
                : List.of();

        return PublicCommandeResponseDTO.builder()
                .commandeId(commande.getId())
                .trackingToken(commande.getTrackingToken())
                .tableId(commande.getTable() != null ? commande.getTable().getId() : null)
                .tableNumero(commande.getTable() != null ? String.valueOf(commande.getTable().getNumero()) : null)
                .total(commande.getTotal())
                .statut(commande.getStatut())
                .dateCreation(commande.getDateCommande() != null ? commande.getDateCommande() : commande.getCreatedAt())
                .tempsEstimeMinutes(tempsEstimeMinutes != null ? tempsEstimeMinutes : 10)
                .notes(commande.getNotes())
                .items(itemDTOs)
                .build();
    }
}
