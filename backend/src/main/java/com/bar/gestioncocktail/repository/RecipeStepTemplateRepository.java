package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link RecipeStepTemplate} entities.
 */
@Repository
public interface RecipeStepTemplateRepository extends JpaRepository<RecipeStepTemplate, Long> {

    /**
     * Finds all templates ordered by name ascending.
     *
     * @return List of templates sorted alphabetically
     */
    List<RecipeStepTemplate> findAllByOrderByNameAsc();

    /**
     * Finds all templates belonging to a specific action type.
     *
     * @param actionType Category of action
     * @return List of matching templates
     */
    List<RecipeStepTemplate> findByActionType(RecipeStepActionType actionType);

    /**
     * Finds a template by its exact name.
     *
     * @param name Name to search for
     * @return Optional containing the matching template if found
     */
    Optional<RecipeStepTemplate> findByName(String name);
}
