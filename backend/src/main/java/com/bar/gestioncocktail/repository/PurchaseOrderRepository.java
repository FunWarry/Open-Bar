package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.PurchaseOrder;
import com.bar.gestioncocktail.model.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link PurchaseOrder} entities.
 */
@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    /**
     * Retrieves all purchase orders ordered by order date descending.
     *
     * @return list of purchase orders
     */
    List<PurchaseOrder> findAllByOrderByDateCommandeDesc();

    /**
     * Retrieves purchase orders filtered by lifecycle status.
     *
     * @param statut target status
     * @return list of matching purchase orders
     */
    List<PurchaseOrder> findByStatutOrderByDateCommandeDesc(PurchaseOrderStatus statut);

    /**
     * Retrieves purchase orders for a given supplier.
     *
     * @param supplierId unique supplier identifier
     * @return list of matching purchase orders
     */
    List<PurchaseOrder> findBySupplierIdOrderByDateCommandeDesc(Long supplierId);

    /**
     * Finds a purchase order by unique document reference.
     *
     * @param reference unique reference (e.g. BC-2026-0001)
     * @return optional purchase order
     */
    Optional<PurchaseOrder> findByReference(String reference);

    /**
     * Counts the number of purchase orders starting with a specific prefix.
     * Useful for auto-generating unique sequential references.
     *
     * @param prefix reference prefix
     * @return count of matching orders
     */
    long countByReferenceStartingWith(String prefix);
}
