package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ChecklistRunItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for individual checklist run execution tasks.
 */
@Repository
public interface ChecklistRunItemRepository extends JpaRepository<ChecklistRunItem, Long> {

    /**
     * Finds items belonging to a run ordered by order index.
     *
     * @param runId Identifier of parent run
     * @return List of run items
     */
    List<ChecklistRunItem> findByRunIdOrderByOrderIndexAsc(Long runId);
}
