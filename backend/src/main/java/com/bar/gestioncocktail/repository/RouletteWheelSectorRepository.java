package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.RouletteWheelSector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link RouletteWheelSector} management.
 */
@Repository
public interface RouletteWheelSectorRepository extends JpaRepository<RouletteWheelSector, Long> {

    /**
     * Finds all active sectors ordered by display order ascending.
     *
     * @return List of active sectors
     */
    List<RouletteWheelSector> findByActiveTrueOrderByDisplayOrderAsc();

    /**
     * Finds all sectors ordered by display order ascending.
     *
     * @return List of all sectors
     */
    List<RouletteWheelSector> findAllByOrderByDisplayOrderAsc();
}
