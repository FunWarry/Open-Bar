package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request payload for checking in an incoming delivery (Bon de Livraison) against a purchase order.
 *
 * @param bonLivraisonRef Delivery slip number or distributor invoice reference
 * @param notes           Reception observations (e.g. damaged box, batch remarks)
 * @param items           Received quantities per line item
 */
@Schema(description = "Payload for recording incoming goods receipt intake")
public record PurchaseOrderReceptionRequest(
        @Size(max = 100, message = "Delivery slip reference cannot exceed 100 characters")
        String bonLivraisonRef,

        String notes,

        @NotEmpty(message = "Reception must specify items received")
        @Valid
        List<PurchaseOrderReceptionItemRequest> items
) {}
