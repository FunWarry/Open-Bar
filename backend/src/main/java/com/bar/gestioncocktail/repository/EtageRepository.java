package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.EtageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for managing {@link EtageEntity} instances.
 */
@Repository
public interface EtageRepository extends JpaRepository<EtageEntity, Long> {

    /**
     * Finds a floor entity by its unique code.
     *
     * @param code the floor code
     * @return an optional containing the floor entity if found
     */
    Optional<EtageEntity> findByCode(String code);

    /**
     * Checks if a floor entity with the given code exists.
     *
     * @param code the floor code
     * @return true if an entity exists, false otherwise
     */
    boolean existsByCode(String code);

    /**
     * Finds all floor entities ordered by their display order ascending.
     *
     * @return list of ordered floor entities
     */
    List<EtageEntity> findAllByOrderByOrdreAsc();
}
