package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.PurchaseOrderDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link PurchaseOrderDelivery} entities.
 */
@Repository
public interface PurchaseOrderDeliveryRepository extends JpaRepository<PurchaseOrderDelivery, Long> {

    /**
     * Finds all deliveries ordered by reception date descending.
     *
     * @return list of deliveries
     */
    List<PurchaseOrderDelivery> findAllByOrderByDateReceptionDesc();

    /**
     * Finds deliveries associated with a specific purchase order.
     *
     * @param purchaseOrderId unique purchase order identifier
     * @return list of deliveries
     */
    List<PurchaseOrderDelivery> findByPurchaseOrderIdOrderByDateReceptionDesc(Long purchaseOrderId);
}
