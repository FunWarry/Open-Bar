package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.FactureReglement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for {@link FactureReglement} entities.
 */
@Repository
public interface FactureReglementRepository extends JpaRepository<FactureReglement, Long> {

    /**
     * Retrieves all split settlements associated with a given invoice ID ordered chronologically.
     *
     * @param factureId Target invoice ID
     * @return List of associated split settlements
     */
    List<FactureReglement> findByFactureIdOrderByIdAsc(Long factureId);
}
