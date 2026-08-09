package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.EmployeeShift;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository JPA pour la gestion des créneaux de travail (shifts).
 */
@Repository
public interface EmployeeShiftRepository extends JpaRepository<EmployeeShift, Long> {
    @Override
    @EntityGraph(attributePaths = {"user"})
    List<EmployeeShift> findAll();

    @Override
    @EntityGraph(attributePaths = {"user"})
    Optional<EmployeeShift> findById(Long id);

    @EntityGraph(attributePaths = {"user"})
    List<EmployeeShift> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user"})
    List<EmployeeShift> findByDateShiftBetween(LocalDate debut, LocalDate fin);

    @EntityGraph(attributePaths = {"user"})
    List<EmployeeShift> findByUserIdAndDateShiftBetween(Long userId, LocalDate debut, LocalDate fin);
}
