package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.CocktailIngredientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/cocktail-ingredients")
public class CocktailIngredientController {
    private final CocktailIngredientService cocktailIngredientService;

    @Autowired
    public CocktailIngredientController(CocktailIngredientService cocktailIngredientService) {
        this.cocktailIngredientService = cocktailIngredientService;
    }

    @PostMapping
    public ResponseEntity<CocktailIngredient> createCocktailIngredient(@RequestBody CocktailIngredient cocktailIngredient) {
        return ResponseEntity.ok(cocktailIngredientService.createCocktailIngredient(cocktailIngredient));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCocktailIngredient(@PathVariable Long id) {
        cocktailIngredientService.deleteCocktailIngredient(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/cocktail/{cocktailId}")
    public ResponseEntity<List<CocktailIngredient>> getIngredientsByCocktail(@PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailIngredientService.getIngredientsByCocktail(cocktail));
    }

    @GetMapping("/ingredient/{ingredientId}")
    public ResponseEntity<List<CocktailIngredient>> getCocktailsByIngredient(@PathVariable Long ingredientId) {
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        return ResponseEntity.ok(cocktailIngredientService.getCocktailsByIngredient(ingredient));
    }

    @PutMapping("/{id}/quantite")
    public ResponseEntity<CocktailIngredient> updateQuantite(@PathVariable Long id, @RequestParam BigDecimal quantite) {
        return cocktailIngredientService.getCocktailIngredientById(id)
            .map(cocktailIngredient -> {
                cocktailIngredientService.updateQuantite(cocktailIngredient, quantite);
                return ResponseEntity.ok(cocktailIngredient);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/cocktail/{cocktailId}/ingredient/{ingredientId}")
    public ResponseEntity<Void> deleteCocktailIngredient(
        @PathVariable Long cocktailId,
        @PathVariable Long ingredientId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        cocktailIngredientService.deleteCocktailIngredient(cocktail, ingredient);
        return ResponseEntity.ok().build();
    }
} 