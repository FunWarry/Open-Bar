package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.InventoryAuditLocationCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link InventoryAuditLocationCount} entities.
 */
@Repository
public interface InventoryAuditLocationCountRepository extends JpaRepository<InventoryAuditLocationCount, Long> {

    /**
     * Retrieves all physical location counts recorded for a specific audit line item.
     *
     * @param auditItemId Unique identifier of the audit item
     * @return List of location count entries
     */
    List<InventoryAuditLocationCount> findByAuditItemId(Long auditItemId);

    /**
     * Finds a location count for an audit item at a specific storage location.
     *
     * @param auditItemId Unique identifier of the audit item
     * @param storageLocation Storage location name (e.g. Main Bar, Wine Cellar)
     * @return Optional containing matching location count
     */
    Optional<InventoryAuditLocationCount> findByAuditItemIdAndStorageLocation(Long auditItemId, String storageLocation);
}
