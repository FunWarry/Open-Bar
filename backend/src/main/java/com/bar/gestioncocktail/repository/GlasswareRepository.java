package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Glassware;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for managing {@link Glassware} entities.
 */
@Repository
public interface GlasswareRepository extends JpaRepository<Glassware, Long> {

    /**
     * Finds a glassware by its unique name (case-insensitive).
     *
     * @param nom Glassware name
     * @return Optional glassware
     */
    Optional<Glassware> findByNomIgnoreCase(String nom);

    /**
     * Retrieves all glassware ordered alphabetically by name.
     *
     * @return List of glassware
     */
    List<Glassware> findAllByOrderByNomAsc();
}
