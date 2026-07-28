package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicCommandeResponseDTO {
    private Long commandeId;
    private String trackingToken;
    private Long tableId;
    private String tableNumero;
    private BigDecimal total;
    private CommandeStatut statut;
    private LocalDateTime dateCreation;
    private Integer tempsEstimeMinutes;
    private String notes;
    private List<CommandeItemResponseDTO> items;

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
