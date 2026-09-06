package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
/**
 * Service managing ingredient proportions and recipe formulations for cocktails.
 */

@Service
@Transactional
public class CocktailIngredientService {
    private final CocktailIngredientRepository cocktailIngredientRepository;

    @Autowired
    public CocktailIngredientService(CocktailIngredientRepository cocktailIngredientRepository) {
        this.cocktailIngredientRepository = cocktailIngredientRepository;
    }
/**
     * Creates and persists a new cocktail ingredient formulation association.
     *
     * @param cocktailIngredient The cocktail ingredient entity to persist
     * @return The saved cocktail ingredient entity
     */

    public CocktailIngredient createCocktailIngredient(CocktailIngredient cocktailIngredient) {
        return cocktailIngredientRepository.save(cocktailIngredient);
    }
/**
     * Removes a cocktail ingredient association by its identifier.
     *
     * @param id Identifier of the cocktail ingredient association
     */

    public void deleteCocktailIngredient(Long id) {
        cocktailIngredientRepository.deleteById(id);
    }
/**
     * Retrieves a cocktail ingredient entity by its identifier.
     *
     * @param id Identifier of the association
     * @return Optional containing the association if found
     */

    public Optional<CocktailIngredient> getCocktailIngredientById(Long id) {
        return cocktailIngredientRepository.findById(id);
    }
/**
     * Retrieves all ingredient associations configured for a given cocktail recipe.
     *
     * @param cocktail The cocktail entity
     * @return List of cocktail ingredient associations
     */

    public List<CocktailIngredient> getIngredientsByCocktail(Cocktail cocktail) {
        return cocktailIngredientRepository.findByCocktail(cocktail);
    }
/**
     * Retrieves all cocktail associations containing the specified ingredient.
     *
     * @param ingredient The ingredient entity
     * @return List of cocktail associations
     */

    public List<CocktailIngredient> getCocktailsByIngredient(Ingredient ingredient) {
        return cocktailIngredientRepository.findByIngredient(ingredient);
    }
/**
     * Updates the ingredient dosage quantity for a cocktail recipe.
     *
     * @param cocktailIngredient The cocktail ingredient association
     * @param quantite           The new dosage quantity
     * @return The updated cocktail ingredient entity
     */

    public void updateQuantite(CocktailIngredient cocktailIngredient, BigDecimal quantite) {
        cocktailIngredient.setQuantite(quantite);
        cocktailIngredientRepository.save(cocktailIngredient);
    }
/**
     * Removes a cocktail ingredient association by its identifier.
     *
     * @param id Identifier of the cocktail ingredient association
     */

    public void deleteCocktailIngredient(Cocktail cocktail, Ingredient ingredient) {
        cocktailIngredientRepository.deleteByCocktailAndIngredient(cocktail, ingredient);
    }
} 