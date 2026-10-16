package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for public order placed via table QR code scan.
 */
@Data
@NoArgsConstructor
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

    /**
     * Creates a new fluent {@link Builder} instance.
     *
     * @return New builder instance
     */
    public static Builder builder() {
        return new Builder();
    }

    /**
     * Fluent builder for constructing {@link PublicCommandeResponseDTO} instances without parameter limits.
     */
    public static class Builder {
        private final PublicCommandeResponseDTO dto = new PublicCommandeResponseDTO();

        /**
         * Sets unique order ID.
         *
         * @param commandeId Unique order identifier
         * @return Fluent builder reference
         */
        public Builder commandeId(Long commandeId) {
            dto.setCommandeId(commandeId);
            return this;
        }

        /**
         * Sets anonymous UUID tracking token.
         *
         * @param trackingToken Order tracking UUID
         * @return Fluent builder reference
         */
        public Builder trackingToken(String trackingToken) {
            dto.setTrackingToken(trackingToken);
            return this;
        }

        /**
         * Sets table ID.
         *
         * @param tableId Scanned table identifier
         * @return Fluent builder reference
         */
        public Builder tableId(Long tableId) {
            dto.setTableId(tableId);
            return this;
        }

        /**
         * Sets table number display string.
         *
         * @param tableNumero Table display number
         * @return Fluent builder reference
         */
        public Builder tableNumero(String tableNumero) {
            dto.setTableNumero(tableNumero);
            return this;
        }

        /**
         * Sets total order amount.
         *
         * @param total Total amount
         * @return Fluent builder reference
         */
        public Builder total(BigDecimal total) {
            dto.setTotal(total);
            return this;
        }

        /**
         * Sets current order status.
         *
         * @param statut Current order lifecycle status
         * @return Fluent builder reference
         */
        public Builder statut(CommandeStatut statut) {
            dto.setStatut(statut);
            return this;
        }

        /**
         * Sets order creation timestamp.
         *
         * @param dateCreation Creation timestamp
         * @return Fluent builder reference
         */
        public Builder dateCreation(LocalDateTime dateCreation) {
            dto.setDateCreation(dateCreation);
            return this;
        }

        /**
         * Sets estimated wait time in minutes.
         *
         * @param tempsEstimeMinutes Estimated wait minutes
         * @return Fluent builder reference
         */
        public Builder tempsEstimeMinutes(Integer tempsEstimeMinutes) {
            dto.setTempsEstimeMinutes(tempsEstimeMinutes);
            return this;
        }

        /**
         * Sets customer preparation notes.
         *
         * @param notes Customer preparation notes
         * @return Fluent builder reference
         */
        public Builder notes(String notes) {
            dto.setNotes(notes);
            return this;
        }

        /**
         * Sets list of ordered items.
         *
         * @param items List of item DTOs
         * @return Fluent builder reference
         */
        public Builder items(List<CommandeItemResponseDTO> items) {
            dto.setItems(items);
            return this;
        }

        /**
         * Builds and returns the configured {@link PublicCommandeResponseDTO}.
         *
         * @return Constructed DTO instance
         */
        public PublicCommandeResponseDTO build() {
            return dto;
        }
    }
}
