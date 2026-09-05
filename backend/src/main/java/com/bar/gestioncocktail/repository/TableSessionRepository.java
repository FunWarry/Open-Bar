package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.TableSession;
import com.bar.gestioncocktail.model.TableSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for managing {@link TableSession} entities.
 */
@Repository
public interface TableSessionRepository extends JpaRepository<TableSession, Long> {

    /**
     * Finds a table session by its unique session token.
     *
     * @param sessionToken Unique ephemeral session token
     * @return Optional containing the session if found
     */
    Optional<TableSession> findBySessionToken(String sessionToken);

    /**
     * Finds the most recent session for a specific table matching the given status.
     *
     * @param tableId Table identifier
     * @param status Session status (e.g. ACTIVE)
     * @return Optional containing the matching session if found
     */
    Optional<TableSession> findFirstByTableIdAndStatusOrderByOpenedAtDesc(Long tableId, TableSessionStatus status);

    /**
     * Lists all sessions for a specific table with a given status.
     *
     * @param tableId Table identifier
     * @param status Session status
     * @return List of matching table sessions
     */
    List<TableSession> findByTableIdAndStatus(Long tableId, TableSessionStatus status);

    /**
     * Lists all sessions for a specific table.
     *
     * @param tableId Table identifier
     * @return List of table sessions
     */
    List<TableSession> findByTableId(Long tableId);

    /**
     * Deletes all sessions associated with the given table.
     *
     * @param tableId Table identifier
     */
    void deleteByTableId(Long tableId);

    /**
     * Updates the status of all sessions for a table matching the current status.
     *
     * @param tableId Table identifier
     * @param currentStatus Current status to match
     * @param newStatus New status to set
     */
    @Modifying
    @Query("UPDATE TableSession s SET s.status = :newStatus WHERE s.tableId = :tableId AND s.status = :currentStatus")
    void updateStatusByTableIdAndStatus(
            @Param("tableId") Long tableId,
            @Param("currentStatus") TableSessionStatus currentStatus,
            @Param("newStatus") TableSessionStatus newStatus);
}
