package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.PurchaseOrderDeliveryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link PurchaseOrderDeliveryItem} entities.
 */
@Repository
public interface PurchaseOrderDeliveryItemRepository extends JpaRepository<PurchaseOrderDeliveryItem, Long> {

    /**
     * Finds delivery line items for a specific ingredient ordered by delivery reception date descending.
     * Useful for displaying historical purchase price variations and PAMP shifts.
     *
     * @param ingredientId unique ingredient identifier
     * @return list of delivery items
     */
    List<PurchaseOrderDeliveryItem> findByIngredientIdOrderByDeliveryDateReceptionDesc(Long ingredientId);

    /**
     * Finds all delivery line items ordered by delivery reception date descending.
     *
     * @return list of delivery items
     */
    List<PurchaseOrderDeliveryItem> findAllByOrderByDeliveryDateReceptionDesc();
}
