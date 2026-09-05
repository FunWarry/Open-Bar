package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ShiftAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Data JPA Repository for immutable shift audit logs.
 */
@Repository
public interface ShiftAuditLogRepository extends JpaRepository<ShiftAuditLog, Long> {

    /**
     * Finds all audit log entries for a given shift, ordered from newest to oldest.
     *
     * @param shiftId Shift identifier
     * @return Ordered list of audit log entries
     */
    List<ShiftAuditLog> findByShiftIdOrderByChangedAtDesc(Long shiftId);

    /**
     * Finds all audit log entries for shifts occurring within a specific date range, ordered descending.
     *
     * @param start Start date (inclusive)
     * @param end End date (inclusive)
     * @return List of audit log entries
     */
    List<ShiftAuditLog> findByDateShiftBetweenOrderByChangedAtDesc(LocalDate start, LocalDate end);

    /**
     * Finds all audit log entries for shifts of a specific user within a date range, ordered descending.
     *
     * @param start Start date (inclusive)
     * @param end End date (inclusive)
     * @param userId User identifier
     * @return List of audit log entries
     */
    List<ShiftAuditLog> findByDateShiftBetweenAndUserIdOrderByChangedAtDesc(LocalDate start, LocalDate end, Long userId);

    /**
     * Finds all audit logs for shifts occurring within a date range that were performed up to a specific timestamp,
     * ordered chronologically from oldest to newest for historical replay reconstruction.
     *
     * @param start Start date (inclusive)
     * @param end End date (inclusive)
     * @param at Cut-off timestamp
     * @return List of audit logs up to the cut-off timestamp
     */
    List<ShiftAuditLog> findByDateShiftBetweenAndChangedAtLessThanEqualOrderByChangedAtAsc(
            LocalDate start, LocalDate end, LocalDateTime at);
}
