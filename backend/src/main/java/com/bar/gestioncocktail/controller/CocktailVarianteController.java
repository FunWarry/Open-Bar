package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.service.CocktailVarianteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/cocktail-variantes")
public class CocktailVarianteController {
    private final CocktailVarianteService cocktailVarianteService;

    @Autowired
    public CocktailVarianteController(CocktailVarianteService cocktailVarianteService) {
        this.cocktailVarianteService = cocktailVarianteService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailVariante> createCocktailVariante(@RequestBody CocktailVariante variante) {
        return ResponseEntity.ok(cocktailVarianteService.createCocktailVariante(variante));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailVariante> updateCocktailVariante(@PathVariable Long id, @RequestBody CocktailVariante variante) {
        variante.setId(id);
        return ResponseEntity.ok(cocktailVarianteService.updateCocktailVariante(variante));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<Void> deleteCocktailVariante(@PathVariable Long id) {
        cocktailVarianteService.deleteCocktailVariante(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CocktailVariante> getCocktailVarianteById(@PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/cocktail/{cocktailId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CocktailVariante>> getVariantesByCocktail(@PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesByCocktail(cocktail));
    }

    @GetMapping("/cocktail/{cocktailId}/disponibles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CocktailVariante>> getVariantesDisponiblesByCocktail(@PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail));
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CocktailVariante>> searchVariantes(@RequestParam String nom) {
        return ResponseEntity.ok(cocktailVarianteService.searchVariantes(nom));
    }

    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    public ResponseEntity<CocktailVariante> toggleDisponibilite(@PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.toggleDisponibilite(variante);
                return ResponseEntity.ok(variante);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/prix-supplement")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailVariante> updatePrixSupplement(@PathVariable Long id, @RequestParam BigDecimal prixSupplement) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.updatePrixSupplement(variante, prixSupplement);
                return ResponseEntity.ok(variante);
            })
            .orElse(ResponseEntity.notFound().build());
    }
} 