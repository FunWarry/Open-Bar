package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;

import java.util.List;

/**
 * Domain event published when a bill/invoice is fully or partially settled.
 *
 * @param facture         The settled or generated invoice entity
 * @param table           The table associated with the settled invoice
 * @param settledOrders   The orders settled by this billing transaction
 * @param tableLiberated  Whether the table was liberated upon settlement
 */
public record InvoiceSettledEvent(
        Facture facture,
        TableEntity table,
        List<Commande> settledOrders,
        boolean tableLiberated
) {
}
