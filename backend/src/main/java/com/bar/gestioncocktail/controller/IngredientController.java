package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.IngredientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/ingredients")
@CrossOrigin(origins = "*")
public class IngredientController {
    private final IngredientService ingredientService;

    @Autowired
    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Ingredient> createIngredient(@Valid @RequestBody Ingredient ingredient) {
        return ResponseEntity.ok(ingredientService.createIngredient(ingredient));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Ingredient> updateIngredient(@PathVariable Long id, @Valid @RequestBody Ingredient ingredient) {
        ingredient.setId(id);
        return ResponseEntity.ok(ingredientService.updateIngredient(ingredient));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Long id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getIngredientById(@PathVariable Long id) {
        return ingredientService.getIngredientById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/seuil-alerte")
    public ResponseEntity<List<Ingredient>> getIngredientsBySeuilAlerte() {
        return ResponseEntity.ok(ingredientService.getIngredientsBySeuilAlerte());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Ingredient>> searchIngredients(@RequestParam String nom) {
        return ResponseEntity.ok(ingredientService.searchIngredients(nom));
    }

    @GetMapping("/fournisseur/{fournisseur}")
    public ResponseEntity<List<Ingredient>> getIngredientsByFournisseur(@PathVariable String fournisseur) {
        return ResponseEntity.ok(ingredientService.getIngredientsByFournisseur(fournisseur));
    }

    @GetMapping("/unite-mesure/{uniteMesure}")
    public ResponseEntity<List<Ingredient>> getIngredientsByUniteMesure(@PathVariable String uniteMesure) {
        return ResponseEntity.ok(ingredientService.getIngredientsByUniteMesure(uniteMesure));
    }

    @PutMapping("/{id}/stock")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Ingredient> updateStock(@PathVariable Long id, @RequestParam BigDecimal quantite) {
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.updateStock(ingredient, quantite);
                return ResponseEntity.ok(ingredient);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/seuil-alerte")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Ingredient> definirSeuilAlerte(@PathVariable Long id, @RequestParam BigDecimal seuil) {
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.definirSeuilAlerte(ingredient, seuil);
                return ResponseEntity.ok(ingredient);
            })
            .orElse(ResponseEntity.notFound().build());
    }
} 