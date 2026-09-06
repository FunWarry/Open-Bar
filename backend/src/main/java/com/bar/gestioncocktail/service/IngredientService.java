package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.event.StockAlertEvent;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
/**
 * Service managing inventory ingredients, stock deductions, and threshold alerts.
 */

@Service
@Transactional
public class IngredientService {
    private final IngredientRepository ingredientRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TimeService timeService;

    public IngredientService(IngredientRepository ingredientRepository, ApplicationEventPublisher eventPublisher, TimeService timeService) {
        this.ingredientRepository = ingredientRepository;
        this.eventPublisher = eventPublisher;
        this.timeService = timeService;
    }

    /**
     * Retrieves all ingredients ordered by name.
     *
     * @return list of all ingredients
     */
    @Transactional(readOnly = true)
    public List<Ingredient> getAllIngredients() {
        return ingredientRepository.findAll();
    }
/**
     * Creates and persists a new inventory ingredient.
     *
     * @param ingredient Ingredient entity to create
     * @return Persisted ingredient entity
     */

    public Ingredient createIngredient(Ingredient ingredient) {
        ingredient.setCreatedAt(timeService.now());
        ingredient.setUpdatedAt(timeService.now());
        return ingredientRepository.save(ingredient);
    }
/**
     * Updates existing ingredient inventory properties and thresholds.
     *
     * @param id          Ingredient identifier
     * @param updatedData Updated properties
     * @return Updated ingredient entity
     */

    public Ingredient updateIngredient(Long id, Ingredient updatedData) {
        Ingredient existing = ingredientRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ingredient not found with ID: " + id));
        existing.setNom(updatedData.getNom());
        existing.setUniteMesure(updatedData.getUniteMesure());
        existing.setQuantiteStock(updatedData.getQuantiteStock());
        existing.setSeuilAlerte(updatedData.getSeuilAlerte());
        existing.setNumeroLot(updatedData.getNumeroLot());
        existing.setDatePeremption(updatedData.getDatePeremption());
        existing.setPrixUnitaire(updatedData.getPrixUnitaire());
        existing.setFournisseur(updatedData.getFournisseur());
        existing.setNotes(updatedData.getNotes());
        existing.setUpdatedAt(timeService.now());
        return ingredientRepository.save(existing);
    }
/**
     * Deletes an ingredient from inventory.
     *
     * @param id Ingredient identifier
     */

    public void deleteIngredient(Long id) {
        ingredientRepository.deleteById(id);
    }
/**
     * Retrieves an ingredient by its identifier.
     *
     * @param id Ingredient identifier
     * @return Optional containing the ingredient if found
     */

    public Optional<Ingredient> getIngredientById(Long id) {
        return ingredientRepository.findById(id);
    }
/**
     * Retrieves all ingredients currently below their low-stock threshold.
     *
     * @return List of low stock ingredients
     */


    public List<Ingredient> getIngredientsBySeuilAlerte() {
        return ingredientRepository.findByQuantiteStockLessThanEqual(BigDecimal.ZERO);
    }
/**
     * Searches ingredients by name substring.
     *
     * @param nom Name substring to match
     * @return List of matching ingredients
     */

    public List<Ingredient> searchIngredients(String nom) {
        return ingredientRepository.findByNomContainingIgnoreCase(nom);
    }
/**
     * Retrieves ingredients sourced from a specific supplier.
     *
     * @param fournisseur Supplier name
     * @return List of matching ingredients
     */

    public List<Ingredient> getIngredientsByFournisseur(String fournisseur) {
        return ingredientRepository.findByFournisseur(fournisseur);
    }
/**
     * Retrieves ingredients grouped by measurement unit (cl, g, piece).
     *
     * @param uniteMesure Measurement unit
     * @return List of matching ingredients
     */

    public List<Ingredient> getIngredientsByUniteMesure(String uniteMesure) {
        return ingredientRepository.findByUniteMesure(uniteMesure);
    }
/**
     * Updates current stock quantity for an ingredient and triggers low-stock alerts if needed.
     *
     * @param ingredient Ingredient entity
     * @param quantite   New stock quantity
     * @return Updated ingredient entity
     */

    public void updateStock(Ingredient ingredient, BigDecimal quantite) {
        ingredient.setQuantiteStock(quantite);
        ingredient.setUpdatedAt(timeService.now());
        ingredientRepository.save(ingredient);
        if (ingredient.getSeuilAlerte() != null && quantite.compareTo(ingredient.getSeuilAlerte()) <= 0 && eventPublisher != null) {
            eventPublisher.publishEvent(new StockAlertEvent(ingredient.getId(), ingredient.getNom(), quantite.doubleValue()));
        }
    }
/**
     * Configures the minimum threshold that triggers low-stock warnings for an ingredient.
     *
     * @param ingredient Ingredient entity
     * @param seuil      Alert threshold quantity
     * @return Updated ingredient entity
     */

    public void definirSeuilAlerte(Ingredient ingredient, BigDecimal seuil) {
        ingredient.setSeuilAlerte(seuil);
        ingredient.setUpdatedAt(timeService.now());
        ingredientRepository.save(ingredient);
    }
}
 