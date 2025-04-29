package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CocktailIngredientRepository extends JpaRepository<CocktailIngredient, Long> {
    List<CocktailIngredient> findByCocktail(Cocktail cocktail);
    List<CocktailIngredient> findByIngredient(Ingredient ingredient);
    void deleteByCocktailAndIngredient(Cocktail cocktail, Ingredient ingredient);
} 