package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PurchaseOrder;
import com.bar.gestioncocktail.model.PurchaseOrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing a purchase order and delivery receipt.
 *
 * @param id                  Unique identifier
 * @param reference           Unique document reference (e.g. BC-2026-0001)
 * @param supplierId          Supplier unique identifier
 * @param supplierNom         Supplier company name
 * @param dateCommande        Order timestamp
 * @param dateLivraisonPrevue Expected delivery timestamp
 * @param dateReception       Actual delivery check-in timestamp
 * @param statut              Order lifecycle status
 * @param notes               Special delivery instructions or notes
 * @param totalHt             Total amount excluding VAT
 * @param totalTva            Total VAT amount
 * @param totalTtc            Total amount including VAT
 * @param createdByNom        Name of staff member who placed the order
 * @param items               Ordered line items
 * @param createdAt           Record creation timestamp
 * @param updatedAt           Last update timestamp
 */
@Schema(description = "Purchase order and goods receipt summary representation")
public record PurchaseOrderDTO(
        Long id,
        String reference,
        Long supplierId,
        String supplierNom,
        LocalDateTime dateCommande,
        LocalDateTime dateLivraisonPrevue,
        LocalDateTime dateReception,
        PurchaseOrderStatus statut,
        String notes,
        BigDecimal totalHt,
        BigDecimal totalTva,
        BigDecimal totalTtc,
        String createdByNom,
        List<PurchaseOrderItemDTO> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Maps a {@link PurchaseOrder} entity to this response DTO.
     *
     * @param po source entity
     * @return response DTO, or null if source entity is null
     */
    public static PurchaseOrderDTO from(PurchaseOrder po) {
        if (po == null) {
            return null;
        }

        List<PurchaseOrderItemDTO> itemDTOs = po.getItems() != null
                ? po.getItems().stream().map(PurchaseOrderItemDTO::from).toList()
                : Collections.emptyList();

        Long suppId = po.getSupplier() != null ? po.getSupplier().getId() : null;
        String suppNom = po.getSupplier() != null ? po.getSupplier().getNom() : "";
        String creator = po.getCreatedBy() != null ? po.getCreatedBy().getNom() : "";

        return new PurchaseOrderDTO(
                po.getId(),
                po.getReference(),
                suppId,
                suppNom,
                po.getDateCommande(),
                po.getDateLivraisonPrevue(),
                po.getDateReception(),
                po.getStatut(),
                po.getNotes(),
                po.getTotalHt(),
                po.getTotalTva(),
                po.getTotalTtc(),
                creator,
                itemDTOs,
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }
}
