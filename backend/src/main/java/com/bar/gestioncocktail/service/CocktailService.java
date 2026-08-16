package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailRecipeStepRequestDTO;
import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CocktailRecipeStep;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.RecipeStepTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Business service managing cocktails and drinks (catalog, availability, seasonality, photo uploads, recipe steps).
 */
@Service
@Transactional
public class CocktailService {
    private final CocktailRepository cocktailRepository;
    private final IngredientRepository ingredientRepository;
    private final RecipeStepTemplateRepository templateRepository;
    private final TimeService timeService;
    private final FileUploadService fileUploadService;

    /**
     * Constructs the service injecting required dependencies.
     *
     * @param cocktailRepository JPA repository for cocktails
     * @param ingredientRepository JPA repository for ingredients
     * @param templateRepository JPA repository for step templates
     * @param timeService Time service provider
     * @param fileUploadService File upload management service
     */
    public CocktailService(
        CocktailRepository cocktailRepository,
        IngredientRepository ingredientRepository,
        RecipeStepTemplateRepository templateRepository,
        TimeService timeService,
        FileUploadService fileUploadService
    ) {
        this.cocktailRepository = cocktailRepository;
        this.ingredientRepository = ingredientRepository;
        this.templateRepository = templateRepository;
        this.timeService = timeService;
        this.fileUploadService = fileUploadService;
    }

    /**
     * Retrieves all cocktails from the menu.
     *
     * @return List of all cocktails
     */
    @Transactional(readOnly = true)
    public List<Cocktail> getAllCocktails() {
        return cocktailRepository.findAll();
    }

    /**
     * Creates and persists a new cocktail from entity.
     *
     * @param cocktail Cocktail entity to create
     * @return Created cocktail
     */
    public Cocktail createCocktail(Cocktail cocktail) {
        cocktail.setCreatedAt(timeService.now());
        cocktail.setUpdatedAt(timeService.now());
        return cocktailRepository.save(cocktail);
    }

    /**
     * Creates and persists a new cocktail with recipe steps from request DTO.
     *
     * @param request Creation request DTO
     * @return Created cocktail response DTO
     */
    public CocktailResponseDTO createCocktailFromRequest(CocktailRequestDTO request) {
        Cocktail cocktail = request.toEntity();
        cocktail.setCreatedAt(timeService.now());
        cocktail.setUpdatedAt(timeService.now());

        if (request.recipeSteps() != null && !request.recipeSteps().isEmpty()) {
            List<CocktailRecipeStep> steps = mapRecipeSteps(cocktail, request.recipeSteps());
            cocktail.setRecipeSteps(steps);
        }

        Cocktail saved = cocktailRepository.save(cocktail);
        return CocktailResponseDTO.from(saved);
    }

    /**
     * Updates an existing cocktail.
     *
     * @param cocktail Updated cocktail entity
     * @return Saved cocktail
     */
    public Cocktail updateCocktail(Cocktail cocktail) {
        cocktail.setUpdatedAt(timeService.now());
        return cocktailRepository.save(cocktail);
    }

    /**
     * Updates an existing cocktail and its recipe steps from request DTO.
     *
     * @param id Cocktail identifier
     * @param request Update request DTO
     * @return Updated cocktail response DTO
     */
    public CocktailResponseDTO updateCocktailFromRequest(Long id, CocktailRequestDTO request) {
        Cocktail cocktail = cocktailRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found with id: " + id));

        cocktail.setNom(request.nom());
        cocktail.setDescription(request.description());
        cocktail.setPrix(request.prix());
        cocktail.setCategorie(request.categorie());
        cocktail.setDisponible(request.disponible());
        cocktail.setSaisonnier(request.saisonnier());
        cocktail.setDateDebutSaison(request.dateDebutSaison());
        cocktail.setDateFinSaison(request.dateFinSaison());
        cocktail.setMoisDebut(request.moisDebut());
        cocktail.setMoisFin(request.moisFin());
        if (request.instructions() != null) {
            cocktail.setInstructions(request.instructions());
        }
        if (request.imageUrl() != null) {
            cocktail.setImageUrl(request.imageUrl());
        }
        cocktail.setUpdatedAt(timeService.now());

        if (request.recipeSteps() != null) {
            cocktail.getRecipeSteps().clear();
            List<CocktailRecipeStep> steps = mapRecipeSteps(cocktail, request.recipeSteps());
            cocktail.getRecipeSteps().addAll(steps);
        }

        Cocktail saved = cocktailRepository.save(cocktail);
        return CocktailResponseDTO.from(saved);
    }

    private List<CocktailRecipeStep> mapRecipeSteps(Cocktail cocktail, List<CocktailRecipeStepRequestDTO> stepDtos) {
        List<CocktailRecipeStep> steps = new ArrayList<>();
        for (CocktailRecipeStepRequestDTO dto : stepDtos) {
            CocktailRecipeStep step = new CocktailRecipeStep();
            step.setCocktail(cocktail);
            step.setStepOrder(dto.stepOrder());
            step.setStepType(dto.stepType());
            step.setQuantite(dto.quantite());
            step.setUnite(dto.unite());
            step.setActionTitle(dto.actionTitle());
            step.setCustomText(dto.customText());
            step.setDurationSeconds(dto.durationSeconds() != null ? dto.durationSeconds() : 0);
            step.setCreatedAt(timeService.now());
            step.setUpdatedAt(timeService.now());

            if (dto.ingredientId() != null) {
                Ingredient ingredient = ingredientRepository.findById(dto.ingredientId())
                    .orElse(null);
                step.setIngredient(ingredient);
            }

            if (dto.templateId() != null) {
                RecipeStepTemplate template = templateRepository.findById(dto.templateId())
                    .orElse(null);
                step.setTemplate(template);
            }

            steps.add(step);
        }
        return steps;
    }

    /**
     * Deletes a cocktail by its identifier.
     *
     * @param id Identifier of the cocktail to delete
     */
    public void deleteCocktail(Long id) {
        cocktailRepository.deleteById(id);
    }

    /**
     * Finds a cocktail by its identifier.
     *
     * @param id Identifier
     * @return {@link Optional} containing the cocktail if found
     */
    public Optional<Cocktail> getCocktailById(Long id) {
        return cocktailRepository.findById(id);
    }

    /**
     * Finds cocktails by category.
     *
     * @param categorie Category (ALCOOLISE, SANS_ALCOOL, SHOT, etc.)
     * @return List of cocktails
     */
    public List<Cocktail> getCocktailsByCategorie(CocktailCategorie categorie) {
        return cocktailRepository.findByCategorie(categorie);
    }

    /**
     * Lists cocktails marked as available.
     *
     * @return List of available cocktails
     */
    public List<Cocktail> getCocktailsDisponibles() {
        return cocktailRepository.findByDisponible(true);
    }

    /**
     * Lists cocktails configured as seasonal.
     *
     * @return List of seasonal cocktails
     */
    public List<Cocktail> getCocktailsSaisonniers() {
        return cocktailRepository.findBySaisonnier(true);
    }

    /**
     * Lists seasonal cocktails whose date range encompasses the current date.
     *
     * @return List of currently seasonal cocktails
     */
    public List<Cocktail> getCocktailsSaisonniersActuels() {
        LocalDateTime now = timeService.now();
        return cocktailRepository.findBySaisonnierAndDateDebutSaisonBeforeAndDateFinSaisonAfter(
            true, now, now);
    }

    /**
     * Searches cocktails by name (case-insensitive).
     *
     * @param nom Keyword
     * @return List of matching cocktails
     */
    public List<Cocktail> searchCocktails(String nom) {
        return cocktailRepository.findByNomContainingIgnoreCase(nom);
    }

    /**
     * Toggles availability of a cocktail.
     *
     * @param cocktail Cocktail to toggle
     */
    public void toggleDisponibilite(Cocktail cocktail) {
        cocktail.setDisponible(!cocktail.isDisponible());
        cocktail.setUpdatedAt(timeService.now());
        cocktailRepository.save(cocktail);
    }

    /**
     * Defines seasonality period of a cocktail with exact timestamps.
     *
     * @param cocktail Cocktail entity
     * @param dateDebut Start timestamp
     * @param dateFin End timestamp
     */
    public void definirSaisonnalite(Cocktail cocktail, LocalDateTime dateDebut, LocalDateTime dateFin) {
        cocktail.setSaisonnier(true);
        cocktail.setDateDebutSaison(dateDebut);
        cocktail.setDateFinSaison(dateFin);
        cocktail.setUpdatedAt(timeService.now());
        cocktailRepository.save(cocktail);
    }

    /**
     * Updates seasonality period by month index (1-12).
     *
     * @param id Cocktail identifier
     * @param moisDebut Start month (1-12)
     * @param moisFin End month (1-12)
     * @return Updated cocktail entity
     */
    @Transactional
    public Cocktail updateSaisonnalite(Long id, Integer moisDebut, Integer moisFin) {
        Cocktail cocktail = cocktailRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found: " + id));
        cocktail.setMoisDebut(moisDebut);
        cocktail.setMoisFin(moisFin);
        cocktail.setSaisonnier(moisDebut != null && moisFin != null);
        return cocktailRepository.save(cocktail);
    }

    /**
     * Stores a new photo for a cocktail and updates its photoUrl attribute.
     *
     * @param id   Identifier of the target cocktail
     * @param file Multipart image file uploaded by user
     * @return Updated cocktail entity
     */
    @Transactional
    public Cocktail updateCocktailImage(Long id, MultipartFile file) {
        Cocktail cocktail = cocktailRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found: " + id));

        String photoUrl = fileUploadService.storeCocktailPhoto(id, file);
        cocktail.setImageUrl(photoUrl);
        cocktail.setUpdatedAt(timeService.now());
        return cocktailRepository.save(cocktail);
    }
}