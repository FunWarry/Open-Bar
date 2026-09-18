package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.CashDrawerSession;
import com.bar.gestioncocktail.model.CashMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Spring Data JPA repository for managing {@link CashMovement} entities.
 */
@Repository
public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {

    /**
     * Finds all cash movements associated with a specific cash drawer session ordered chronologically.
     *
     * @param session Target cash drawer session
     * @return Ordered list of cash movements
     */
    List<CashMovement> findBySessionOrderByTimestampAsc(CashDrawerSession session);

    /**
     * Finds all cash movements recorded on a specific calendar date ordered chronologically.
     *
     * @param movementDate Operational date
     * @return Ordered list of cash movements
     */
    List<CashMovement> findByMovementDateOrderByTimestampAsc(LocalDate movementDate);

    /**
     * Finds all cash movements by the parent session identifier.
     *
     * @param sessionId Session identifier
     * @return Ordered list of cash movements
     */
    List<CashMovement> findBySessionIdOrderByTimestampAsc(Long sessionId);
}
