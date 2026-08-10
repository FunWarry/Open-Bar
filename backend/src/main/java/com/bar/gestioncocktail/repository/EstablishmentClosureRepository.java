package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ClosureType;
import com.bar.gestioncocktail.model.EstablishmentClosure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

/**
 * JPA Repository for Establishment Closures.
 */
@Repository
public interface EstablishmentClosureRepository extends JpaRepository<EstablishmentClosure, Long> {

    List<EstablishmentClosure> findByType(ClosureType type);

    Optional<EstablishmentClosure> findByTypeAndDayOfWeek(ClosureType type, DayOfWeek dayOfWeek);
}
