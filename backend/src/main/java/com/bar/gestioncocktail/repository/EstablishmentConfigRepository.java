package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.EstablishmentConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link EstablishmentConfig}.
 */
@Repository
public interface EstablishmentConfigRepository extends JpaRepository<EstablishmentConfig, Long> {
}
