package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class IngredientService {
    private final IngredientRepository ingredientRepository;
    private final NotificationService notificationService;
    private final TimeService timeService;

    public IngredientService(IngredientRepository ingredientRepository, NotificationService notificationService, TimeService timeService) {
        this.ingredientRepository = ingredientRepository;
        this.notificationService = notificationService;
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

    public Ingredient createIngredient(Ingredient ingredient) {
        ingredient.setCreatedAt(timeService.now());
        ingredient.setUpdatedAt(timeService.now());
        return ingredientRepository.save(ingredient);
    }

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

    public void deleteIngredient(Long id) {
        ingredientRepository.deleteById(id);
    }

    public Optional<Ingredient> getIngredientById(Long id) {
        return ingredientRepository.findById(id);
    }


    public List<Ingredient> getIngredientsBySeuilAlerte() {
        return ingredientRepository.findByQuantiteStockLessThanEqual(BigDecimal.ZERO);
    }

    public List<Ingredient> searchIngredients(String nom) {
        return ingredientRepository.findByNomContainingIgnoreCase(nom);
    }

    public List<Ingredient> getIngredientsByFournisseur(String fournisseur) {
        return ingredientRepository.findByFournisseur(fournisseur);
    }

    public List<Ingredient> getIngredientsByUniteMesure(String uniteMesure) {
        return ingredientRepository.findByUniteMesure(uniteMesure);
    }

    public void updateStock(Ingredient ingredient, BigDecimal quantite) {
        ingredient.setQuantiteStock(quantite);
        ingredient.setUpdatedAt(timeService.now());
        ingredientRepository.save(ingredient);
        if (ingredient.getSeuilAlerte() != null && quantite.compareTo(ingredient.getSeuilAlerte()) <= 0) {
            notificationService.notifierStockFaible(ingredient.getId(), ingredient.getNom(), quantite.doubleValue());
        }
    }

    public void definirSeuilAlerte(Ingredient ingredient, BigDecimal seuil) {
        ingredient.setSeuilAlerte(seuil);
        ingredient.setUpdatedAt(timeService.now());
        ingredientRepository.save(ingredient);
    }
}
 