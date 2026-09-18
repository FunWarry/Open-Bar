package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.CashDrawerSession;
import com.bar.gestioncocktail.model.CashDrawerSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for managing {@link CashDrawerSession} entities.
 */
@Repository
public interface CashDrawerSessionRepository extends JpaRepository<CashDrawerSession, Long> {

    /**
     * Finds the active or closed cash drawer session for a specific calendar date and status.
     *
     * @param sessionDate Operational session date
     * @param status Drawer session status (OPEN or CLOSED)
     * @return Optional containing the session if present
     */
    Optional<CashDrawerSession> findBySessionDateAndStatus(LocalDate sessionDate, CashDrawerSessionStatus status);

    /**
     * Finds all cash drawer sessions recorded for a specific date, ordered by opening time descending.
     *
     * @param sessionDate Operational session date
     * @return List of drawer sessions
     */
    List<CashDrawerSession> findBySessionDateOrderByOpenedAtDesc(LocalDate sessionDate);

    /**
     * Finds the latest session by status ordered by opening time descending.
     *
     * @param status Desired status (typically OPEN)
     * @return Optional containing the most recent matching session
     */
    Optional<CashDrawerSession> findFirstByStatusOrderByOpenedAtDesc(CashDrawerSessionStatus status);

    /**
     * Checks whether an active session of a given status exists for a specific date.
     *
     * @param sessionDate Operational session date
     * @param status Drawer session status
     * @return True if session exists, false otherwise
     */
    boolean existsBySessionDateAndStatus(LocalDate sessionDate, CashDrawerSessionStatus status);
}
