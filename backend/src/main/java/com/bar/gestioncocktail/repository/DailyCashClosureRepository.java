package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.DailyCashClosure;
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
    Optional<DailyCashClosure> findByClosureDate(LocalDate closureDate);

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
    List<DailyCashClosure> findAllByOrderByClosureDateDesc();

    /**
     * Finds a register closure by its unique serial closure number.
     *
     * @param closureNumber The unique Z-number
     * @return Optional containing the found closure
     */
    Optional<DailyCashClosure> findByClosureNumber(String closureNumber);

    /**
     * Counts how many closures have been registered with a given prefix (e.g. "Z-2026-").
     *
     * @param prefix Closure number prefix
     * @return Number of matching closures
     */
    long countByClosureNumberStartingWith(String prefix);
}
