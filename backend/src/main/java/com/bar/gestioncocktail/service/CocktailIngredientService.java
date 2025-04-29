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

@Service
@Transactional
public class CocktailIngredientService {
    private final CocktailIngredientRepository cocktailIngredientRepository;

    @Autowired
    public CocktailIngredientService(CocktailIngredientRepository cocktailIngredientRepository) {
        this.cocktailIngredientRepository = cocktailIngredientRepository;
    }

    public CocktailIngredient createCocktailIngredient(CocktailIngredient cocktailIngredient) {
        return cocktailIngredientRepository.save(cocktailIngredient);
    }

    public void deleteCocktailIngredient(Long id) {
        cocktailIngredientRepository.deleteById(id);
    }

    public Optional<CocktailIngredient> getCocktailIngredientById(Long id) {
        return cocktailIngredientRepository.findById(id);
    }

    public List<CocktailIngredient> getIngredientsByCocktail(Cocktail cocktail) {
        return cocktailIngredientRepository.findByCocktail(cocktail);
    }

    public List<CocktailIngredient> getCocktailsByIngredient(Ingredient ingredient) {
        return cocktailIngredientRepository.findByIngredient(ingredient);
    }

    public void updateQuantite(CocktailIngredient cocktailIngredient, BigDecimal quantite) {
        cocktailIngredient.setQuantite(quantite);
        cocktailIngredientRepository.save(cocktailIngredient);
    }

    public void deleteCocktailIngredient(Cocktail cocktail, Ingredient ingredient) {
        cocktailIngredientRepository.deleteByCocktailAndIngredient(cocktail, ingredient);
    }
} 