package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.CocktailRecipeStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link CocktailRecipeStep} entities.
 */
@Repository
public interface CocktailRecipeStepRepository extends JpaRepository<CocktailRecipeStep, Long> {

    /**
     * Finds all recipe steps for a specific cocktail ordered by stepOrder ascending.
     *
     * @param cocktailId Cocktail identifier
     * @return Ordered list of recipe steps
     */
    List<CocktailRecipeStep> findByCocktailIdOrderByStepOrderAsc(Long cocktailId);

    /**
     * Deletes all recipe steps associated with a cocktail.
     *
     * @param cocktailId Cocktail identifier
     */
    void deleteByCocktailId(Long cocktailId);
}
