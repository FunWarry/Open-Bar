package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.EmployeeShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Repository JPA pour la gestion des créneaux de travail (shifts).
 */
@Repository
public interface EmployeeShiftRepository extends JpaRepository<EmployeeShift, Long> {
    List<EmployeeShift> findByUserId(Long userId);

    List<EmployeeShift> findByDateShiftBetween(LocalDate debut, LocalDate fin);

    List<EmployeeShift> findByUserIdAndDateShiftBetween(Long userId, LocalDate debut, LocalDate fin);
}
