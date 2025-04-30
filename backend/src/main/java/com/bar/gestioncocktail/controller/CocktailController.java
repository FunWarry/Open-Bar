package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.service.CocktailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/cocktails")
@CrossOrigin(origins = "*")
public class CocktailController {
    private final CocktailService cocktailService;

    @Autowired
    public CocktailController(CocktailService cocktailService) {
        this.cocktailService = cocktailService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Cocktail> createCocktail(@Valid @RequestBody Cocktail cocktail) {
        return ResponseEntity.ok(cocktailService.createCocktail(cocktail));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Cocktail> updateCocktail(@PathVariable Long id, @Valid @RequestBody Cocktail cocktail) {
        cocktail.setId(id);
        return ResponseEntity.ok(cocktailService.updateCocktail(cocktail));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCocktail(@PathVariable Long id) {
        cocktailService.deleteCocktail(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cocktail> getCocktailById(@PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/categorie/{categorie}")
    public ResponseEntity<List<Cocktail>> getCocktailsByCategorie(@PathVariable CocktailCategorie categorie) {
        return ResponseEntity.ok(cocktailService.getCocktailsByCategorie(categorie));
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<Cocktail>> getCocktailsDisponibles() {
        return ResponseEntity.ok(cocktailService.getCocktailsDisponibles());
    }

    @GetMapping("/saisonniers")
    public ResponseEntity<List<Cocktail>> getCocktailsSaisonniers() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniers());
    }

    @GetMapping("/saisonniers/actuels")
    public ResponseEntity<List<Cocktail>> getCocktailsSaisonniersActuels() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniersActuels());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Cocktail>> searchCocktails(@RequestParam String nom) {
        return ResponseEntity.ok(cocktailService.searchCocktails(nom));
    }

    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Cocktail> toggleDisponibilite(@PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(cocktail -> {
                cocktailService.toggleDisponibilite(cocktail);
                return ResponseEntity.ok(cocktail);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/saisonnalite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMEN')")
    public ResponseEntity<Cocktail> definirSaisonnalite(
        @PathVariable Long id,
        @RequestParam LocalDateTime dateDebut,
        @RequestParam LocalDateTime dateFin) {
        return cocktailService.getCocktailById(id)
            .map(cocktail -> {
                cocktailService.definirSaisonnalite(cocktail, dateDebut, dateFin);
                return ResponseEntity.ok(cocktail);
            })
            .orElse(ResponseEntity.notFound().build());
    }
} 