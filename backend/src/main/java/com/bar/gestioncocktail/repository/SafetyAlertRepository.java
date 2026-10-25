package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.SafetyAlert;
import com.bar.gestioncocktail.model.SafetyAlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Data JPA Repository for managing patron {@link SafetyAlert} records.
 */
@Repository
public interface SafetyAlertRepository extends JpaRepository<SafetyAlert, Long> {

    /**
     * Finds all alerts matching the specified status ordered by newest creation date first.
     *
     * @param status Alert status (ACTIVE, RESOLVED)
     * @return List of matching safety alerts
     */
    List<SafetyAlert> findByStatusOrderByCreatedAtDesc(SafetyAlertStatus status);

    /**
     * Finds all alerts for a specific table with the given status.
     *
     * @param tableId Table primary key
     * @param status Alert status
     * @return List of matching safety alerts
     */
    List<SafetyAlert> findByTableIdAndStatus(Long tableId, SafetyAlertStatus status);

    /**
     * Checks if any alert of given status exists for a table.
     *
     * @param tableId Table primary key
     * @param status Alert status
     * @return True if at least one matching alert exists
     */
    boolean existsByTableIdAndStatus(Long tableId, SafetyAlertStatus status);

    /**
     * Retrieves recent alerts for a table created after a given timestamp (used for anti-spam rate limiting).
     *
     * @param tableId Table primary key
     * @param since Earliest creation timestamp to consider
     * @return List of recent alerts for the table
     */
    @Query("SELECT s FROM SafetyAlert s WHERE s.table.id = :tableId AND s.createdAt >= :since ORDER BY s.createdAt DESC")
    List<SafetyAlert> findRecentAlertsForTable(@Param("tableId") Long tableId, @Param("since") LocalDateTime since);
}
