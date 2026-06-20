package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailVarianteResponseDTO;
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
    public ResponseEntity<CocktailVarianteResponseDTO> createCocktailVariante(@RequestBody CocktailVariante variante) {
        return ResponseEntity.ok(CocktailVarianteResponseDTO.from(
            cocktailVarianteService.createCocktailVariante(variante)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailVarianteResponseDTO> updateCocktailVariante(@PathVariable Long id, @RequestBody CocktailVariante variante) {
        variante.setId(id);
        return ResponseEntity.ok(CocktailVarianteResponseDTO.from(
            cocktailVarianteService.updateCocktailVariante(variante)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<Void> deleteCocktailVariante(@PathVariable Long id) {
        cocktailVarianteService.deleteCocktailVariante(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CocktailVarianteResponseDTO> getCocktailVarianteById(@PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(CocktailVarianteResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/cocktail/{cocktailId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> getVariantesByCocktail(@PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesByCocktail(cocktail).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    @GetMapping("/cocktail/{cocktailId}/disponibles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> getVariantesDisponiblesByCocktail(@PathVariable Long cocktailId) {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(cocktailId);
        return ResponseEntity.ok(cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CocktailVarianteResponseDTO>> searchVariantes(@RequestParam String nom) {
        return ResponseEntity.ok(cocktailVarianteService.searchVariantes(nom).stream()
            .map(CocktailVarianteResponseDTO::from).toList());
    }

    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    public ResponseEntity<CocktailVarianteResponseDTO> toggleDisponibilite(@PathVariable Long id) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.toggleDisponibilite(variante);
                return ResponseEntity.ok(CocktailVarianteResponseDTO.from(variante));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/prix-supplement")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailVarianteResponseDTO> updatePrixSupplement(@PathVariable Long id, @RequestParam BigDecimal prixSupplement) {
        return cocktailVarianteService.getCocktailVarianteById(id)
            .map(variante -> {
                cocktailVarianteService.updatePrixSupplement(variante, prixSupplement);
                return ResponseEntity.ok(CocktailVarianteResponseDTO.from(variante));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
