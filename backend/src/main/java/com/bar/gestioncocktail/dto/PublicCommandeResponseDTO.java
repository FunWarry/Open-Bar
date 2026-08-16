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
 * Response DTO for public order placed via table QR code scan.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Confirmation and tracking data for a public QR code order")
public class PublicCommandeResponseDTO {
    @Schema(description = "Unique order ID")
    private Long commandeId;

    @Schema(description = "Anonymous UUID tracking token")
    private String trackingToken;

    @Schema(description = "Table ID")
    private Long tableId;

    @Schema(description = "Table number")
    private String tableNumero;

    @Schema(description = "Total order amount")
    private BigDecimal total;

    @Schema(description = "Current order status")
    private CommandeStatut statut;

    @Schema(description = "Order creation timestamp")
    private LocalDateTime dateCreation;

    @Schema(description = "Estimated wait time in minutes")
    private Integer tempsEstimeMinutes;

    @Schema(description = "Customer preparation notes")
    private String notes;

    @Schema(description = "List of ordered items")
    private List<CommandeItemResponseDTO> items;

    /**
     * Creates a {@link PublicCommandeResponseDTO} from a {@link Commande} entity.
     *
     * @param commande Source order entity
     * @param tempsEstimeMinutes Estimated preparation time
     * @return Constructed DTO
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
