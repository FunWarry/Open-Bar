package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailIngredientResponseDTO;
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
    public ResponseEntity<CocktailIngredientResponseDTO> createCocktailIngredient(@RequestBody CocktailIngredient cocktailIngredient) {
        return ResponseEntity.ok(CocktailIngredientResponseDTO.from(
            cocktailIngredientService.createCocktailIngredient(cocktailIngredient)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCocktailIngredient(@PathVariable Long id) {
        cocktailIngredientService.deleteCocktailIngredient(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/cocktail/{cocktailId}")
    public ResponseEntity<List<CocktailIngredientResponseDTO>> getIngredientsByCocktail(@PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailIngredientService.getIngredientsByCocktail(cocktail).stream()
            .map(CocktailIngredientResponseDTO::from).toList());
    }

    @GetMapping("/ingredient/{ingredientId}")
    public ResponseEntity<List<CocktailIngredientResponseDTO>> getCocktailsByIngredient(@PathVariable Long ingredientId) {
        Ingredient ingredient = new Ingredient();
        ingredient.setId(ingredientId);
        return ResponseEntity.ok(cocktailIngredientService.getCocktailsByIngredient(ingredient).stream()
            .map(CocktailIngredientResponseDTO::from).toList());
    }

    @PutMapping("/{id}/quantite")
    public ResponseEntity<CocktailIngredientResponseDTO> updateQuantite(@PathVariable Long id, @RequestParam BigDecimal quantite) {
        return cocktailIngredientService.getCocktailIngredientById(id)
            .map(cocktailIngredient -> {
                cocktailIngredientService.updateQuantite(cocktailIngredient, quantite);
                return ResponseEntity.ok(CocktailIngredientResponseDTO.from(cocktailIngredient));
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
