package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ChecklistCategory;
import com.bar.gestioncocktail.model.ChecklistTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for managing operational {@link ChecklistTemplate} entities.
 */
@Repository
public interface ChecklistTemplateRepository extends JpaRepository<ChecklistTemplate, Long> {

    /**
     * Finds active checklist templates ordered by category and title.
     *
     * @param isActive Desired active state
     * @return List of matching templates
     */
    List<ChecklistTemplate> findByIsActiveOrderByCategoryAscTitleAsc(Boolean isActive);

    /**
     * Finds active checklist templates filtered by category.
     *
     * @param category Operational category
     * @param isActive Desired active state
     * @return List of matching templates
     */
    List<ChecklistTemplate> findByCategoryAndIsActiveOrderByTitleAsc(ChecklistCategory category, Boolean isActive);
}
