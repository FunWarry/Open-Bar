package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.AvoirCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link AvoirCredit}.
 */
@Repository
public interface AvoirCreditRepository extends JpaRepository<AvoirCredit, Long> {
    Optional<AvoirCredit> findByFactureId(Long factureId);
    Optional<AvoirCredit> findByNumero(String numero);
}
