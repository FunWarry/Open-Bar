package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.BarTab;
import com.bar.gestioncocktail.model.BarTabStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link BarTab} persistence and querying.
 */
@Repository
public interface BarTabRepository extends JpaRepository<BarTab, Long> {

    /**
     * Finds all bar tabs matching a specific operational status, ordered newest first.
     *
     * @param statut Target status (e.g. ACTIVE)
     * @return List of matching bar tabs
     */
    @EntityGraph(attributePaths = {"serveur", "tableOriginale"})
    List<BarTab> findByStatutOrderByIdDesc(BarTabStatus statut);

    /**
     * Finds all bar tabs matching a status.
     *
     * @param statut Target status
     * @return List of matching bar tabs
     */
    List<BarTab> findByStatut(BarTabStatus statut);

    /**
     * Finds a single bar tab with its assigned server and original table eagerly fetched.
     *
     * @param id Bar tab identifier
     * @return Optional containing the detailed bar tab if found
     */
    @EntityGraph(attributePaths = {"serveur", "tableOriginale"})
    Optional<BarTab> findDetailedById(Long id);

    /**
     * Counts active bar tabs in the system.
     *
     * @param statut Status to count
     * @return Number of tabs with the specified status
     */
    long countByStatut(BarTabStatus statut);

    /**
     * Finds all bar tabs ordered by opening date descending.
     *
     * @return List of all bar tabs
     */
    @EntityGraph(attributePaths = {"serveur", "tableOriginale"})
    List<BarTab> findAllByOrderByOpenedAtDesc();

    /**
     * Finds active bar tabs associated with a specific server.
     *
     * @param serveurId Server user identifier
     * @param statut    Target status
     * @return List of matching tabs
     */
    @Query("SELECT b FROM BarTab b WHERE b.serveur.id = :serveurId AND b.statut = :statut ORDER BY b.id DESC")
    List<BarTab> findByServeurIdAndStatut(@Param("serveurId") Long serveurId, @Param("statut") BarTabStatus statut);
}
