package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.WeekSchedulePublication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link WeekSchedulePublication} entities.
 */
public interface WeekSchedulePublicationRepository extends JpaRepository<WeekSchedulePublication, Long> {

    /**
     * Finds a publication record by the Monday date of the target week.
     *
     * @param weekStart ISO date of Monday
     * @return Optional publication record
     */
    Optional<WeekSchedulePublication> findByWeekStart(LocalDate weekStart);
}
