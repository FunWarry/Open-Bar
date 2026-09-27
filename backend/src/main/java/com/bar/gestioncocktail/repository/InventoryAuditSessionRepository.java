package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.InventoryAuditSession;
import com.bar.gestioncocktail.model.InventoryAuditStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link InventoryAuditSession} entities.
 */
@Repository
public interface InventoryAuditSessionRepository extends JpaRepository<InventoryAuditSession, Long> {

    /**
     * Retrieves all inventory audit sessions ordered chronologically descending by creation date.
     *
     * @return List of inventory audit sessions
     */
    List<InventoryAuditSession> findAllByOrderByCreatedAtDesc();

    /**
     * Retrieves inventory audit sessions matching a specific status, ordered chronologically descending.
     *
     * @param status Status filter
     * @return List of matching audit sessions
     */
    List<InventoryAuditSession> findByStatusOrderByCreatedAtDesc(InventoryAuditStatus status);

    /**
     * Finds an audit session by its unique human-readable reference code.
     *
     * @param referenceCode Unique audit reference (e.g. INV-20260927-001)
     * @return Optional containing matching session if found
     */
    Optional<InventoryAuditSession> findByReferenceCode(String referenceCode);

    /**
     * Checks if an audit session exists with the given reference code.
     *
     * @param referenceCode Reference code to verify
     * @return True if exists, false otherwise
     */
    boolean existsByReferenceCode(String referenceCode);

    /**
     * Counts audit sessions currently in a specific status (e.g. DRAFT or IN_PROGRESS).
     *
     * @param status Status to count
     * @return Number of matching sessions
     */
    long countByStatus(InventoryAuditStatus status);
}
