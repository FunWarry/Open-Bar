package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailRecipeStepRequestDTO;
import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteIngredientRequestDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteRequestDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.CocktailRecipeStep;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.CocktailVarianteIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.RecipeStepType;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.RecipeStepTemplateRepository;
import com.bar.gestioncocktail.dto.RecipeStepTemplateResponseDTO;
import com.bar.gestioncocktail.dto.CocktailRecipeStepResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
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
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();

    private final CocktailRepository cocktailRepository;
    private final CommandeItemRepository commandeItemRepository;
    private final IngredientRepository ingredientRepository;
    private final RecipeStepTemplateRepository templateRepository;
    private final GlasswareRepository glasswareRepository;
    private final TimeService timeService;
    private final FileUploadService fileUploadService;
    private final NotificationService notificationService;

    /**
     * Constructs the service injecting required dependencies.
     *
     * @param cocktailRepository JPA repository for cocktails
     * @param commandeItemRepository JPA repository for order items
     * @param ingredientRepository JPA repository for ingredients
     * @param templateRepository JPA repository for step templates
     * @param glasswareRepository JPA repository for glassware
     * @param timeService Time service provider
     * @param fileUploadService File upload management service
     * @param notificationService Notification service for WebSocket broadcasts
     */
    public CocktailService(
        CocktailRepository cocktailRepository,
        CommandeItemRepository commandeItemRepository,
        IngredientRepository ingredientRepository,
        RecipeStepTemplateRepository templateRepository,
        GlasswareRepository glasswareRepository,
        TimeService timeService,
        FileUploadService fileUploadService,
        NotificationService notificationService
    ) {
        this.cocktailRepository = cocktailRepository;
        this.commandeItemRepository = commandeItemRepository;
        this.ingredientRepository = ingredientRepository;
        this.templateRepository = templateRepository;
        this.glasswareRepository = glasswareRepository;
        this.timeService = timeService;
        this.fileUploadService = fileUploadService;
        this.notificationService = notificationService;
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
        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
        return saved;
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

        if (request.glasswareId() != null) {
            glasswareRepository.findById(request.glasswareId())
                .ifPresent(cocktail::setGlassware);
        }

        if (request.recipeSteps() != null && !request.recipeSteps().isEmpty()) {
            List<CocktailRecipeStep> steps = mapRecipeSteps(cocktail, request.recipeSteps());
            cocktail.setRecipeSteps(steps);
            syncIngredientsFromRecipeSteps(cocktail, steps);
        }

        if (request.variantes() != null && !request.variantes().isEmpty()) {
            List<CocktailVariante> vars = mapVariantes(cocktail, request.variantes());
            cocktail.setVariantes(vars);
        }

        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
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
        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
        return saved;
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
        if (request.disponible() != null) {
            cocktail.setDisponible(request.disponible());
        }
        if (request.saisonnier() != null) {
            cocktail.setSaisonnier(request.saisonnier());
        }
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
        if (request.glasswareId() != null) {
            glasswareRepository.findById(request.glasswareId())
                .ifPresent(cocktail::setGlassware);
        } else {
            cocktail.setGlassware(null);
        }
        cocktail.setUpdatedAt(timeService.now());

        if (request.recipeSteps() != null) {
            if (cocktail.getRecipeSteps() == null) {
                cocktail.setRecipeSteps(new ArrayList<>());
            }
            cocktail.getRecipeSteps().clear();
            List<CocktailRecipeStep> steps = mapRecipeSteps(cocktail, request.recipeSteps());
            cocktail.getRecipeSteps().addAll(steps);
            syncIngredientsFromRecipeSteps(cocktail, steps);
        }

        if (request.variantes() != null) {
            syncVariantes(cocktail, request.variantes());
        }

        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
        return CocktailResponseDTO.from(saved);
    }

    private void syncVariantes(Cocktail cocktail, List<CocktailVarianteRequestDTO> varianteDtos) {
        if (cocktail.getVariantes() == null) {
            cocktail.setVariantes(new ArrayList<>());
        }

        List<CocktailVariante> currentVars = new ArrayList<>(cocktail.getVariantes());
        List<CocktailVariante> updatedList = processVarianteDtos(cocktail, varianteDtos, currentVars);

        removeDeletedVariantes(cocktail, updatedList);

        for (CocktailVariante v : updatedList) {
            if (!cocktail.getVariantes().contains(v)) {
                cocktail.getVariantes().add(v);
            }
        }
    }

    private List<CocktailVariante> processVarianteDtos(
        Cocktail cocktail,
        List<CocktailVarianteRequestDTO> dtos,
        List<CocktailVariante> currentVars
    ) {
        List<CocktailVariante> updatedList = new ArrayList<>();
        for (CocktailVarianteRequestDTO dto : dtos) {
            CocktailVariante existing = findMatchingVariante(dto, currentVars);
            if (existing != null) {
                updateSingleVariante(existing, dto);
                updatedList.add(existing);
            } else {
                updatedList.add(mapSingleVariante(cocktail, dto));
            }
        }
        return updatedList;
    }

    private CocktailVariante findMatchingVariante(CocktailVarianteRequestDTO dto, List<CocktailVariante> currentVars) {
        if (dto.id() != null) {
            return currentVars.stream()
                .filter(v -> dto.id().equals(v.getId()))
                .findFirst().orElse(null);
        }
        if (dto.nom() != null) {
            return currentVars.stream()
                .filter(v -> dto.nom().equalsIgnoreCase(v.getNom()))
                .findFirst().orElse(null);
        }
        return null;
    }

    private void removeDeletedVariantes(Cocktail cocktail, List<CocktailVariante> updatedList) {
        List<CocktailVariante> toRemove = new ArrayList<>();
        List<Long> idsToRemove = new ArrayList<>();

        for (CocktailVariante existing : cocktail.getVariantes()) {
            boolean keep = false;
            for (CocktailVariante u : updatedList) {
                if (isSameVariante(existing, u)) {
                    keep = true;
                    break;
                }
            }
            if (!keep) {
                toRemove.add(existing);
                if (existing != null && existing.getId() != null) {
                    idsToRemove.add(existing.getId());
                }
            }
        }

        if (!toRemove.isEmpty()) {
            if (!idsToRemove.isEmpty()) {
                commandeItemRepository.nullifyVarianteForIds(idsToRemove);
            }
            cocktail.getVariantes().removeAll(toRemove);
        }
    }

    private boolean isSameVariante(CocktailVariante a, CocktailVariante b) {
        if (a == null || b == null) return false;
        if (a.getId() != null && b.getId() != null) {
            return a.getId().equals(b.getId());
        }
        return a == b;
    }

    private void updateSingleVariante(CocktailVariante v, CocktailVarianteRequestDTO dto) {
        v.setNom(dto.nom());
        v.setDescription(dto.description());
        v.setPrixSupplement(dto.prixSupplement() != null ? dto.prixSupplement() : BigDecimal.ZERO);
        v.setMultiplicateurIngredient(dto.multiplicateurIngredient() != null ? dto.multiplicateurIngredient() : BigDecimal.ONE);
        v.setDisponible(!Boolean.FALSE.equals(dto.disponible()));
        v.setInstructions(dto.instructions());
        v.setUpdatedAt(timeService.now());

        if (dto.recipeSteps() != null && !dto.recipeSteps().isEmpty()) {
            v.setRecipeStepsJson(serializeRecipeSteps(dto.recipeSteps()));
        } else {
            v.setRecipeStepsJson(null);
        }

        if (v.getIngredients() == null) {
            v.setIngredients(new ArrayList<>());
        }
        v.getIngredients().clear();

        if (dto.ingredients() != null && !dto.ingredients().isEmpty()) {
            v.getIngredients().addAll(mapVarianteIngredients(v, dto.ingredients()));
        } else if (dto.recipeSteps() != null && !dto.recipeSteps().isEmpty()) {
            v.getIngredients().addAll(extractIngredientsFromSteps(v, dto.recipeSteps()));
        }
    }

    private void syncIngredientsFromRecipeSteps(Cocktail cocktail, List<CocktailRecipeStep> steps) {
        if (cocktail.getIngredients() == null) {
            cocktail.setIngredients(new ArrayList<>());
        }
        cocktail.getIngredients().clear();
        for (CocktailRecipeStep step : steps) {
            if (step.getStepType() == RecipeStepType.INGREDIENT && step.getIngredient() != null) {
                CocktailIngredient ci = new CocktailIngredient();
                ci.setCocktail(cocktail);
                ci.setIngredient(step.getIngredient());
                ci.setQuantite(step.getQuantite() != null ? step.getQuantite() : BigDecimal.ZERO);
                ci.setCreatedAt(timeService.now());
                ci.setUpdatedAt(timeService.now());
                cocktail.getIngredients().add(ci);
            }
        }
    }

    private List<CocktailVariante> mapVariantes(Cocktail cocktail, List<CocktailVarianteRequestDTO> varianteDtos) {
        List<CocktailVariante> variantes = new ArrayList<>();
        for (CocktailVarianteRequestDTO dto : varianteDtos) {
            variantes.add(mapSingleVariante(cocktail, dto));
        }
        return variantes;
    }

    private CocktailVariante mapSingleVariante(Cocktail cocktail, CocktailVarianteRequestDTO dto) {
        CocktailVariante v = new CocktailVariante();
        v.setCocktail(cocktail);
        v.setNom(dto.nom());
        v.setDescription(dto.description());
        v.setPrixSupplement(dto.prixSupplement() != null ? dto.prixSupplement() : BigDecimal.ZERO);
        v.setMultiplicateurIngredient(dto.multiplicateurIngredient() != null ? dto.multiplicateurIngredient() : BigDecimal.ONE);
        v.setDisponible(!Boolean.FALSE.equals(dto.disponible()));
        v.setInstructions(dto.instructions());
        v.setCreatedAt(timeService.now());
        v.setUpdatedAt(timeService.now());

        if (dto.recipeSteps() != null && !dto.recipeSteps().isEmpty()) {
            v.setRecipeStepsJson(serializeRecipeSteps(dto.recipeSteps()));
        } else {
            v.setRecipeStepsJson(null);
        }

        if (dto.ingredients() != null && !dto.ingredients().isEmpty()) {
            v.setIngredients(mapVarianteIngredients(v, dto.ingredients()));
        } else if (dto.recipeSteps() != null && !dto.recipeSteps().isEmpty()) {
            v.setIngredients(extractIngredientsFromSteps(v, dto.recipeSteps()));
        }
        return v;
    }

    private String serializeRecipeSteps(List<CocktailRecipeStepRequestDTO> steps) {
        if (steps == null || steps.isEmpty()) {
            return null;
        }
        try {
            List<CocktailRecipeStepResponseDTO> responseSteps = new ArrayList<>();
            for (CocktailRecipeStepRequestDTO s : steps) {
                String ingNom = null;
                if (s.ingredientId() != null) {
                    Optional<Ingredient> ingOpt = ingredientRepository.findById(s.ingredientId());
                    if (ingOpt.isPresent()) {
                        ingNom = ingOpt.get().getNom();
                    }
                }
                RecipeStepTemplateResponseDTO tplDto = null;
                if (s.templateId() != null) {
                    Optional<RecipeStepTemplate> tplOpt = templateRepository.findById(s.templateId());
                    if (tplOpt.isPresent()) {
                        tplDto = RecipeStepTemplateResponseDTO.from(tplOpt.get());
                    }
                }
                responseSteps.add(new CocktailRecipeStepResponseDTO(
                    null,
                    null,
                    s.stepOrder(),
                    s.stepType(),
                    s.ingredientId(),
                    ingNom,
                    s.quantite(),
                    s.unite(),
                    s.templateId(),
                    tplDto,
                    s.actionTitle(),
                    s.customText(),
                    s.durationSeconds(),
                    timeService.now(),
                    timeService.now()
                ));
            }
            return OBJECT_MAPPER.writeValueAsString(responseSteps);
        } catch (Exception _) {
            return null;
        }
    }

    private List<CocktailVarianteIngredient> extractIngredientsFromSteps(
        CocktailVariante v,
        List<CocktailRecipeStepRequestDTO> steps
    ) {
        List<CocktailVarianteIngredient> list = new ArrayList<>();
        for (CocktailRecipeStepRequestDTO s : steps) {
            if (s.stepType() == RecipeStepType.INGREDIENT && s.ingredientId() != null) {
                ingredientRepository.findById(s.ingredientId()).ifPresent(ing -> {
                    CocktailVarianteIngredient vi = new CocktailVarianteIngredient();
                    vi.setVariante(v);
                    vi.setIngredient(ing);
                    vi.setQuantite(s.quantite() != null ? s.quantite() : BigDecimal.ZERO);
                    vi.setUnite(s.unite() != null ? s.unite() : "cl");
                    vi.setNotes(s.customText());
                    list.add(vi);
                });
            }
        }
        return list;
    }

    private List<CocktailVarianteIngredient> mapVarianteIngredients(CocktailVariante v, List<CocktailVarianteIngredientRequestDTO> dtoList) {
        List<CocktailVarianteIngredient> varIngs = new ArrayList<>();
        for (CocktailVarianteIngredientRequestDTO ingDto : dtoList) {
            if (ingDto.ingredientId() != null) {
                ingredientRepository.findById(ingDto.ingredientId()).ifPresent(ing -> {
                    CocktailVarianteIngredient vi = new CocktailVarianteIngredient();
                    vi.setVariante(v);
                    vi.setIngredient(ing);
                    vi.setQuantite(ingDto.quantite() != null ? ingDto.quantite() : BigDecimal.ZERO);
                    vi.setUnite(ingDto.unite());
                    vi.setNotes(ingDto.notes());
                    varIngs.add(vi);
                });
            }
        }
        return varIngs;
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
        notificationService.notifierCocktailSupprime(id);
    }

    /**
     * Finds a cocktail by its identifier.
     *
     * @param id Identifier
     * @return {@link Optional} containing the cocktail if found
     */
    @Transactional(readOnly = true)
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
        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
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
        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
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
        cocktail.setUpdatedAt(timeService.now());
        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
        return saved;
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
        Cocktail saved = cocktailRepository.save(cocktail);
        notificationService.notifierCocktailMisAJour(saved);
        return saved;
    }
}