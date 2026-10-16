package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ChecklistCategory;
import com.bar.gestioncocktail.model.ChecklistRun;
import com.bar.gestioncocktail.model.ChecklistRunStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Data JPA repository for operational checklist execution runs.
 */
@Repository
public interface ChecklistRunRepository extends JpaRepository<ChecklistRun, Long> {

    /**
     * Finds runs filtered by execution status, most recent first.
     *
     * @param status Status of checklist run
     * @return List of matching runs
     */
    List<ChecklistRun> findByStatusOrderByStartedAtDesc(ChecklistRunStatus status);

    /**
     * Finds runs within a specific date-time interval.
     *
     * @param start Range start timestamp
     * @param end   Range end timestamp
     * @return List of runs started within interval
     */
    List<ChecklistRun> findByStartedAtBetweenOrderByStartedAtDesc(LocalDateTime start, LocalDateTime end);

    /**
     * Finds runs completed within a specific date-time interval.
     *
     * @param start Range start timestamp
     * @param end   Range end timestamp
     * @return List of runs completed within interval
     */
    List<ChecklistRun> findByCompletedAtBetweenOrderByCompletedAtDesc(LocalDateTime start, LocalDateTime end);

    /**
     * Finds all runs ordered by start time descending.
     *
     * @return Ordered list of runs
     */
    List<ChecklistRun> findAllByOrderByStartedAtDesc();

    /**
     * Finds runs filtered by operational category.
     *
     * @param category Operational category
     * @return List of matching runs
     */
    List<ChecklistRun> findByCategoryOrderByStartedAtDesc(ChecklistCategory category);

    /**
     * Counts active runs with a given status.
     *
     * @param status Target status
     * @return Count of runs
     */
    long countByStatus(ChecklistRunStatus status);

    /**
     * Finds the most recently started run for a specific template matching the execution status.
     *
     * @param templateId Template identifier
     * @param status     Run status
     * @return Optional containing matching run if one exists
     */
    java.util.Optional<ChecklistRun> findFirstByTemplateIdAndStatusOrderByStartedAtDesc(Long templateId, ChecklistRunStatus status);
}
