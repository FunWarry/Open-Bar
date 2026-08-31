package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.TableAppel;
import com.bar.gestioncocktail.model.TableAppelStatut;
import com.bar.gestioncocktail.model.TableAppelType;
import com.bar.gestioncocktail.model.TableEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for managing {@link TableAppel} persistence operations.
 */
@Repository
public interface TableAppelRepository extends JpaRepository<TableAppel, Long> {

    /**
     * Finds all table alerts matching a specific status, ordered newest first.
     *
     * @param statut Lifecycle status
     * @return List of matching table alerts
     */
    List<TableAppel> findByStatutOrderByCreatedAtDesc(TableAppelStatut statut);

    /**
     * Finds all alerts for a specific table matching a status.
     *
     * @param table Table entity
     * @param statut Lifecycle status
     * @return List of matching table alerts
     */
    List<TableAppel> findByTableAndStatut(TableEntity table, TableAppelStatut statut);

    /**
     * Finds all alerts for a specific table ID matching a status.
     *
     * @param tableId Table identifier
     * @param statut Lifecycle status
     * @return List of matching table alerts
     */
    List<TableAppel> findByTableIdAndStatut(Long tableId, TableAppelStatut statut);

    /**
     * Checks whether an active pending alert of the given type exists for a table.
     *
     * @param tableId Table identifier
     * @param type Call alert type
     * @param statut Lifecycle status
     * @return True if an alert exists, false otherwise
     */
    boolean existsByTableIdAndTypeAndStatut(Long tableId, TableAppelType type, TableAppelStatut statut);

    /**
     * Finds recent alerts for a table created after a certain timestamp (used for rate-limiting).
     *
     * @param tableId Table identifier
     * @param since Earliest creation timestamp
     * @return List of recent alerts
     */
    @Query("SELECT a FROM TableAppel a WHERE a.table.id = :tableId AND a.createdAt >= :since ORDER BY a.createdAt DESC")
    List<TableAppel> findRecentAppelsForTable(@Param("tableId") Long tableId, @Param("since") LocalDateTime since);

    /**
     * Finds the latest active alert for a table.
     *
     * @param tableId Table identifier
     * @param statut Lifecycle status
     * @return Optional latest alert
     */
    Optional<TableAppel> findTopByTableIdAndStatutOrderByCreatedAtDesc(Long tableId, TableAppelStatut statut);
}
