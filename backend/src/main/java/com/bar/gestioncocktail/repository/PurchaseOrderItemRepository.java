package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link PurchaseOrderItem} entities.
 */
@Repository
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

    /**
     * Finds line items belonging to a specific purchase order.
     *
     * @param purchaseOrderId unique purchase order identifier
     * @return list of items
     */
    List<PurchaseOrderItem> findByPurchaseOrderId(Long purchaseOrderId);

    /**
     * Finds purchase order items for a specific ingredient.
     *
     * @param ingredientId unique ingredient identifier
     * @return list of items
     */
    List<PurchaseOrderItem> findByIngredientId(Long ingredientId);
}
