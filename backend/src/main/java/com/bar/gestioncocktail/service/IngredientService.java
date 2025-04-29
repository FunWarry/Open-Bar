package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class IngredientService {
    private final IngredientRepository ingredientRepository;

    @Autowired
    public IngredientService(IngredientRepository ingredientRepository) {
        this.ingredientRepository = ingredientRepository;
    }

    public Ingredient createIngredient(Ingredient ingredient) {
        ingredient.setCreatedAt(LocalDateTime.now());
        ingredient.setUpdatedAt(LocalDateTime.now());
        return ingredientRepository.save(ingredient);
    }

    public Ingredient updateIngredient(Ingredient ingredient) {
        ingredient.setUpdatedAt(LocalDateTime.now());
        return ingredientRepository.save(ingredient);
    }

    public void deleteIngredient(Long id) {
        ingredientRepository.deleteById(id);
    }

    public Optional<Ingredient> getIngredientById(Long id) {
        return ingredientRepository.findById(id);
    }

    public List<Ingredient> getIngredientsBySeuilAlerte() {
        return ingredientRepository.findByQuantiteStockLessThanEqual(BigDecimal.ZERO);
    }

    public List<Ingredient> searchIngredients(String nom) {
        return ingredientRepository.findByNomContainingIgnoreCase(nom);
    }

    public List<Ingredient> getIngredientsByFournisseur(String fournisseur) {
        return ingredientRepository.findByFournisseur(fournisseur);
    }

    public List<Ingredient> getIngredientsByUniteMesure(String uniteMesure) {
        return ingredientRepository.findByUniteMesure(uniteMesure);
    }

    public void updateStock(Ingredient ingredient, BigDecimal quantite) {
        ingredient.setQuantiteStock(quantite);
        ingredient.setUpdatedAt(LocalDateTime.now());
        ingredientRepository.save(ingredient);
    }

    public void definirSeuilAlerte(Ingredient ingredient, BigDecimal seuil) {
        ingredient.setSeuilAlerte(seuil);
        ingredient.setUpdatedAt(LocalDateTime.now());
        ingredientRepository.save(ingredient);
    }
} 