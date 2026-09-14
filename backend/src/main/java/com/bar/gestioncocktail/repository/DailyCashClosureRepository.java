package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.DailyCashClosure;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for managing {@link DailyCashClosure} entities.
 */
@Repository
public interface DailyCashClosureRepository extends JpaRepository<DailyCashClosure, Long> {

    /**
     * Finds a register closure by its exact closure date.
     *
     * @param closureDate The date of closure
     * @return Optional containing the found closure, or empty
     */
    @EntityGraph(attributePaths = {"closedBy"})
    Optional<DailyCashClosure> findByClosureDate(LocalDate closureDate);

    /**
     * Finds a register closure by its database ID with closedBy eagerly loaded.
     *
     * @param id The unique identifier
     * @return Optional containing the found closure
     */
    @Override
    @EntityGraph(attributePaths = {"closedBy"})
    Optional<DailyCashClosure> findById(Long id);

    /**
     * Checks whether a register closure already exists for a specific date.
     *
     * @param closureDate The date to verify
     * @return True if already closed, false otherwise
     */
    boolean existsByClosureDate(LocalDate closureDate);

    /**
     * Retrieves all register closures sorted by closure date in descending order.
     *
     * @return List of closures ordered from most recent to oldest
     */
    @EntityGraph(attributePaths = {"closedBy"})
    List<DailyCashClosure> findAllByOrderByClosureDateDesc();

    /**
     * Finds a register closure by its unique serial closure number.
     *
     * @param closureNumber The unique Z-number
     * @return Optional containing the found closure
     */
    @EntityGraph(attributePaths = {"closedBy"})
    Optional<DailyCashClosure> findByClosureNumber(String closureNumber);

    /**
     * Counts how many closures have been registered with a given prefix (e.g. "Z-2026-").
     *
     * @param prefix Closure number prefix
     * @return Number of matching closures
     */
    long countByClosureNumberStartingWith(String prefix);
}
