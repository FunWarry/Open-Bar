package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.IngredientConfectionSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link IngredientConfectionSource} entities,
 * managing the confection source mappings between crafted and raw ingredients.
 */
public interface IngredientConfectionSourceRepository extends JpaRepository<IngredientConfectionSource, Long> {

    /**
     * Finds all confection sources for a specific crafted ingredient.
     *
     * @param craftedIngredientId identifier of the crafted ingredient
     * @return list of confection source mappings
     */
    List<IngredientConfectionSource> findByCraftedIngredientId(Long craftedIngredientId);

    /**
     * Deletes all confection source mappings for a specific crafted ingredient.
     *
     * @param craftedIngredientId identifier of the crafted ingredient
     */
    void deleteByCraftedIngredientId(Long craftedIngredientId);

    /**
     * Finds all confection sources where a given ingredient is used as a source.
     *
     * @param sourceIngredientId identifier of the source ingredient
     * @return list of confection source mappings using this ingredient as source
     */
    List<IngredientConfectionSource> findBySourceIngredientId(Long sourceIngredientId);
}
