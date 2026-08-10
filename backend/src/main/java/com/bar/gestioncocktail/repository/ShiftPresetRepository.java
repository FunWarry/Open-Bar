package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ShiftPreset;
import com.bar.gestioncocktail.model.TypeShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for managing ShiftPreset entities.
 */
@Repository
public interface ShiftPresetRepository extends JpaRepository<ShiftPreset, Long> {
    Optional<ShiftPreset> findByTypeShift(TypeShift typeShift);
}
