package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.event.StockAlertEvent;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.IngredientConfectionSource;
import com.bar.gestioncocktail.repository.IngredientConfectionSourceRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.dto.ConfectionSourceRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import com.bar.gestioncocktail.model.Allergen;
/**
 * Service managing inventory ingredients, stock deductions, and threshold alerts.
 */

@Service
@Transactional
public class IngredientService {
    private final IngredientRepository ingredientRepository;
    private final IngredientConfectionSourceRepository confectionSourceRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TimeService timeService;

    /**
     * Constructs the ingredient service with required repositories and event publisher.
     *
     * @param ingredientRepository       Repository for ingredient persistence
     * @param confectionSourceRepository Repository for confection source mappings
     * @param eventPublisher             Publisher for domain events (stock alerts)
     * @param timeService                Service for deterministic timestamping
     */
    public IngredientService(
            IngredientRepository ingredientRepository,
            IngredientConfectionSourceRepository confectionSourceRepository,
            ApplicationEventPublisher eventPublisher,
            TimeService timeService) {
        this.ingredientRepository = ingredientRepository;
        this.confectionSourceRepository = confectionSourceRepository;
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
     * Creates and persists a new inventory ingredient with optional confection source mappings.
     *
     * @param ingredient      Ingredient entity to create
     * @param sourceRequests  Optional list of confection source mappings
     * @return Persisted ingredient entity with confection sources
     */
    public Ingredient createIngredientWithSources(Ingredient ingredient, List<ConfectionSourceRequest> sourceRequests) {
        ingredient.setCreatedAt(timeService.now());
        ingredient.setUpdatedAt(timeService.now());
        if (sourceRequests != null && !sourceRequests.isEmpty()) {
            syncSourceAllergensAndDietary(ingredient, sourceRequests);
        }
        Ingredient saved = ingredientRepository.save(ingredient);
        if (sourceRequests != null && !sourceRequests.isEmpty()) {
            persistConfectionSources(saved, sourceRequests);
        }
        return ingredientRepository.findById(saved.getId()).orElse(saved);
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
        existing.setAllergens(updatedData.getAllergens());
        existing.setDegreAlcool(updatedData.getDegreAlcool());
        existing.setIsVegan(updatedData.getIsVegan());
        existing.setCategory(updatedData.getCategory() != null && !updatedData.getCategory().isBlank() ? updatedData.getCategory() : "other");
        existing.setDefaultSupplier(updatedData.getDefaultSupplier());
        existing.setCodeBarre(updatedData.getCodeBarre());
        existing.setIsCrafted(updatedData.getIsCrafted());
        existing.setIsPurchasable(updatedData.getIsPurchasable());
        existing.setUpdatedAt(timeService.now());
        return ingredientRepository.save(existing);
    }

    /**
     * Updates an ingredient along with its confection source mappings.
     *
     * @param id             Ingredient identifier
     * @param updatedData    Updated ingredient data
     * @param sourceRequests New set of confection source mappings (replaces existing)
     * @return Updated ingredient entity
     */
    public Ingredient updateIngredientWithSources(Long id, Ingredient updatedData, List<ConfectionSourceRequest> sourceRequests) {
        if (sourceRequests != null && !sourceRequests.isEmpty()) {
            syncSourceAllergensAndDietary(updatedData, sourceRequests);
        }
        Ingredient updated = updateIngredient(id, updatedData);
        confectionSourceRepository.deleteByCraftedIngredientId(id);
        if (sourceRequests != null && !sourceRequests.isEmpty()) {
            persistConfectionSources(updated, sourceRequests);
        }
        return ingredientRepository.findById(id).orElse(updated);
    }

    /**
     * Synchronizes allergens and vegan state from confection source ingredients.
     * Ensures all source allergens are inherited into the crafted ingredient and
     * enforces non-vegan state if any source ingredient is non-vegan or contains animal allergens.
     *
     * @param ingredient     Target crafted ingredient
     * @param sourceRequests List of confection source requests
     */
    private void syncSourceAllergensAndDietary(Ingredient ingredient, List<ConfectionSourceRequest> sourceRequests) {
        if (sourceRequests == null || sourceRequests.isEmpty()) {
            return;
        }
        Set<Allergen> allergens = ingredient.getAllergens() != null
                ? new HashSet<>(ingredient.getAllergens())
                : new HashSet<>();

        List<Ingredient> validSources = new ArrayList<>();
        for (ConfectionSourceRequest req : sourceRequests) {
            findValidSource(req).ifPresent(validSources::add);
        }

        boolean forceNonVegan = false;
        for (Ingredient source : validSources) {
            if (source.getAllergens() != null) {
                allergens.addAll(source.getAllergens());
            }
            if (isSourceNonVegan(source)) {
                forceNonVegan = true;
            }
        }
        ingredient.setAllergens(allergens);

        if (forceNonVegan) {
            ingredient.setIsVegan(false);
        }
    }

    /**
     * Finds an existing ingredient matching a valid confection source request.
     *
     * @param req Confection source request
     * @return Optional containing the source ingredient if valid and found
     */
    private Optional<Ingredient> findValidSource(ConfectionSourceRequest req) {
        if (!isValidSourceRequest(req)) {
            return Optional.empty();
        }
        return ingredientRepository.findById(req.sourceIngredientId());
    }

    /**
     * Determines whether a source ingredient forces non-vegan status.
     *
     * @param source Source ingredient
     * @return true if source is non-vegan or contains dairy or egg allergens
     */
    private boolean isSourceNonVegan(Ingredient source) {
        if (Boolean.FALSE.equals(source.getIsVegan())) {
            return true;
        }
        Set<Allergen> sourceAllergens = source.getAllergens();
        return sourceAllergens != null
                && (sourceAllergens.contains(Allergen.LAIT) || sourceAllergens.contains(Allergen.OEUF));
    }

    /**
     * Persists a list of confection source mappings for a crafted ingredient.
     *
     * @param craftedIngredient the crafted ingredient
     * @param sourceRequests    list of confection source requests
     */
    private void persistConfectionSources(Ingredient craftedIngredient, List<ConfectionSourceRequest> sourceRequests) {
        for (ConfectionSourceRequest req : sourceRequests) {
            Ingredient source = isValidSourceRequest(req)
                    ? ingredientRepository.findById(req.sourceIngredientId()).orElse(null)
                    : null;
            if (source != null) {
                IngredientConfectionSource mapping = new IngredientConfectionSource();
                mapping.setCraftedIngredient(craftedIngredient);
                mapping.setSourceIngredient(source);
                mapping.setYieldRatio(req.yieldRatio());
                mapping.setYieldUnit(req.yieldUnit());
                mapping.setNotes(req.notes());
                confectionSourceRepository.save(mapping);
            }
        }
    }

    /**
     * Checks whether a confection source request has the minimum required fields.
     *
     * @param req confection source request
     * @return true if the request is valid for persistence
     */
    private boolean isValidSourceRequest(ConfectionSourceRequest req) {
        return req != null && req.sourceIngredientId() != null && req.yieldRatio() != null;
    }


    /**
     * Finds an ingredient by its exact barcode or QR code.
     *
     * @param codeBarre barcode or QR code string
     * @return matching ingredient entity, or empty Optional
     */
    @Transactional(readOnly = true)
    public Optional<Ingredient> findByCodeBarre(String codeBarre) {
        if (codeBarre == null || codeBarre.isBlank()) {
            return Optional.empty();
        }
        return ingredientRepository.findByCodeBarre(codeBarre.trim());
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
     */
    public void definirSeuilAlerte(Ingredient ingredient, BigDecimal seuil) {
        ingredient.setSeuilAlerte(seuil);
        ingredient.setUpdatedAt(timeService.now());
        ingredientRepository.save(ingredient);
    }
}
 