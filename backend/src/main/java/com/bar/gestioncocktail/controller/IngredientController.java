package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.IngredientResponseDTO;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.IngredientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<IngredientResponseDTO> createIngredient(@Valid @RequestBody Ingredient ingredient) {
        return ResponseEntity.ok(IngredientResponseDTO.from(ingredientService.createIngredient(ingredient)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<IngredientResponseDTO> updateIngredient(@PathVariable Long id, @Valid @RequestBody Ingredient ingredient) {
        ingredient.setId(id);
        return ResponseEntity.ok(IngredientResponseDTO.from(ingredientService.updateIngredient(ingredient)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Long id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<IngredientResponseDTO> getIngredientById(@PathVariable Long id) {
        return ingredientService.getIngredientById(id)
            .map(IngredientResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/seuil-alerte")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsBySeuilAlerte() {
        return ResponseEntity.ok(ingredientService.getIngredientsBySeuilAlerte().stream()
            .map(IngredientResponseDTO::from).toList());
    }

    @GetMapping("/search")
    public ResponseEntity<List<IngredientResponseDTO>> searchIngredients(@RequestParam String nom) {
        return ResponseEntity.ok(ingredientService.searchIngredients(nom).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    @GetMapping("/fournisseur/{fournisseur}")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsByFournisseur(@PathVariable String fournisseur) {
        return ResponseEntity.ok(ingredientService.getIngredientsByFournisseur(fournisseur).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    @GetMapping("/unite-mesure/{uniteMesure}")
    public ResponseEntity<List<IngredientResponseDTO>> getIngredientsByUniteMesure(@PathVariable String uniteMesure) {
        return ResponseEntity.ok(ingredientService.getIngredientsByUniteMesure(uniteMesure).stream()
            .map(IngredientResponseDTO::from).toList());
    }

    @PutMapping("/{id}/stock")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<IngredientResponseDTO> updateStock(@PathVariable Long id, @RequestParam BigDecimal quantite) {
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.updateStock(ingredient, quantite);
                return ResponseEntity.ok(IngredientResponseDTO.from(ingredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/seuil-alerte")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<IngredientResponseDTO> definirSeuilAlerte(@PathVariable Long id, @RequestParam BigDecimal seuil) {
        return ingredientService.getIngredientById(id)
            .map(ingredient -> {
                ingredientService.definirSeuilAlerte(ingredient, seuil);
                return ResponseEntity.ok(IngredientResponseDTO.from(ingredient));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
