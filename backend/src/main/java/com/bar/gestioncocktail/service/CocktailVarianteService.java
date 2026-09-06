package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
/**
 * Service managing cocktail variants, recipe adaptations, and price supplements.
 */

@Service
@Transactional
public class CocktailVarianteService {
    private final CocktailVarianteRepository cocktailVarianteRepository;
    private final TimeService timeService;

    public CocktailVarianteService(CocktailVarianteRepository cocktailVarianteRepository, TimeService timeService) {
        this.cocktailVarianteRepository = cocktailVarianteRepository;
        this.timeService = timeService;
    }
/**
     * Creates and persists a new recipe variant for a cocktail.
     *
     * @param variante The cocktail variant entity to create
     * @return The persisted cocktail variant
     */

    public CocktailVariante createCocktailVariante(CocktailVariante variante) {
        variante.setCreatedAt(timeService.now());
        variante.setUpdatedAt(timeService.now());
        return cocktailVarianteRepository.save(variante);
    }
/**
     * Updates details of an existing cocktail variant.
     *
     * @param variante The variant entity containing updated values
     * @return The updated cocktail variant
     */

    public CocktailVariante updateCocktailVariante(CocktailVariante variante) {
        variante.setUpdatedAt(timeService.now());
        return cocktailVarianteRepository.save(variante);
    }
/**
     * Deletes a cocktail variant by its identifier.
     *
     * @param id Identifier of the variant to delete
     */

    public void deleteCocktailVariante(Long id) {
        cocktailVarianteRepository.deleteById(id);
    }
/**
     * Retrieves a cocktail variant by its identifier.
     *
     * @param id Variant identifier
     * @return Optional containing the variant if found
     */

    public Optional<CocktailVariante> getCocktailVarianteById(Long id) {
        return cocktailVarianteRepository.findById(id);
    }
/**
     * Retrieves all recipe variants configured for a cocktail.
     *
     * @param cocktail The parent cocktail entity
     * @return List of recipe variants
     */

    public List<CocktailVariante> getVariantesByCocktail(Cocktail cocktail) {
        return cocktailVarianteRepository.findByCocktail(cocktail);
    }
/**
     * Retrieves currently available variants for a cocktail recipe.
     *
     * @param cocktail The parent cocktail entity
     * @return List of available variants
     */

    public List<CocktailVariante> getVariantesDisponiblesByCocktail(Cocktail cocktail) {
        return cocktailVarianteRepository.findByCocktailAndDisponible(cocktail, true);
    }
/**
     * Searches cocktail variants by name substring.
     *
     * @param nom Search term
     * @return List of matching variants
     */

    public List<CocktailVariante> searchVariantes(String nom) {
        return cocktailVarianteRepository.findByNomContainingIgnoreCase(nom);
    }
/**
     * Toggles the availability status of a cocktail variant.
     *
     * @param variante The variant to toggle
     * @return The updated variant
     */

    public void toggleDisponibilite(CocktailVariante variante) {
        variante.setDisponible(!variante.isDisponible());
        variante.setUpdatedAt(timeService.now());
        cocktailVarianteRepository.save(variante);
    }
/**
     * Updates the price supplement associated with selecting this variant.
     *
     * @param variante       The variant to update
     * @param prixSupplement New additional price
     * @return The updated variant
     */

    public void updatePrixSupplement(CocktailVariante variante, BigDecimal prixSupplement) {
        variante.setPrixSupplement(prixSupplement);
        variante.setUpdatedAt(timeService.now());
        cocktailVarianteRepository.save(variante);
    }
}
 