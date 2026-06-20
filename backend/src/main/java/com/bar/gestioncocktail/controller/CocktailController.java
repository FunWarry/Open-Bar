package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailResponseDTO;
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
@RequestMapping("/api/cocktails")
@CrossOrigin(origins = "*")
public class CocktailController {
    private final CocktailService cocktailService;

    @Autowired
    public CocktailController(CocktailService cocktailService) {
        this.cocktailService = cocktailService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailResponseDTO> createCocktail(@Valid @RequestBody Cocktail cocktail) {
        return ResponseEntity.ok(CocktailResponseDTO.from(cocktailService.createCocktail(cocktail)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailResponseDTO> updateCocktail(@PathVariable Long id, @Valid @RequestBody Cocktail cocktail) {
        cocktail.setId(id);
        return ResponseEntity.ok(CocktailResponseDTO.from(cocktailService.updateCocktail(cocktail)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCocktail(@PathVariable Long id) {
        cocktailService.deleteCocktail(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CocktailResponseDTO> getCocktailById(@PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(CocktailResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/categorie/{categorie}")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsByCategorie(@PathVariable CocktailCategorie categorie) {
        return ResponseEntity.ok(cocktailService.getCocktailsByCategorie(categorie).stream()
            .map(CocktailResponseDTO::from).toList());
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsDisponibles() {
        return ResponseEntity.ok(cocktailService.getCocktailsDisponibles().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    @GetMapping("/saisonniers")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsSaisonniers() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniers().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    @GetMapping("/saisonniers/actuels")
    public ResponseEntity<List<CocktailResponseDTO>> getCocktailsSaisonniersActuels() {
        return ResponseEntity.ok(cocktailService.getCocktailsSaisonniersActuels().stream()
            .map(CocktailResponseDTO::from).toList());
    }

    @GetMapping("/search")
    public ResponseEntity<List<CocktailResponseDTO>> searchCocktails(@RequestParam String nom) {
        return ResponseEntity.ok(cocktailService.searchCocktails(nom).stream()
            .map(CocktailResponseDTO::from).toList());
    }

    @PutMapping("/{id}/disponibilite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN') or hasRole('MANAGER')")
    public ResponseEntity<CocktailResponseDTO> toggleDisponibilite(@PathVariable Long id) {
        return cocktailService.getCocktailById(id)
            .map(cocktail -> {
                cocktailService.toggleDisponibilite(cocktail);
                return cocktailService.getCocktailById(id)
                    .map(updated -> ResponseEntity.ok(CocktailResponseDTO.from(updated)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/saisonnalite")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BARMAN')")
    public ResponseEntity<CocktailResponseDTO> definirSaisonnalite(
        @PathVariable Long id,
        @RequestParam LocalDateTime dateDebut,
        @RequestParam LocalDateTime dateFin) {
        return cocktailService.getCocktailById(id)
            .map(cocktail -> {
                cocktailService.definirSaisonnalite(cocktail, dateDebut, dateFin);
                return cocktailService.getCocktailById(id)
                    .map(updated -> ResponseEntity.ok(CocktailResponseDTO.from(updated)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
