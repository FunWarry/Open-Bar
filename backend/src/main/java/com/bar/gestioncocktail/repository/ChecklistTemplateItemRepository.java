package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ChecklistTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for individual checklist template task items.
 */
@Repository
public interface ChecklistTemplateItemRepository extends JpaRepository<ChecklistTemplateItem, Long> {

    /**
     * Finds items belonging to a template sorted by display order.
     *
     * @param templateId ID of parent template
     * @return List of template items
     */
    List<ChecklistTemplateItem> findByTemplateIdOrderByOrderIndexAsc(Long templateId);
}
