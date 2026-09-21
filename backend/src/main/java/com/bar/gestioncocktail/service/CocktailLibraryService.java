package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailLibraryImportRequestDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryImportResultDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO.CocktailLibraryIngredientDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO.CocktailLibraryRecipeStepDTO;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Service managing the preconfigured cocktail library catalog and batch import into establishment inventory.
 * <p>
 * Provides filtering by category, spirit, dietary preference, and flavor profiles,
 * and performs smart inventory deduplication upon recipe import.
 */
@Service
public class CocktailLibraryService {

    private static final Logger log = LoggerFactory.getLogger(CocktailLibraryService.class);
    private static final String LIBRARY_RESOURCE_PATH = "data/cocktail_library.json";
    private static final String FALLBACK_RESOURCE_PATH = "data/test_cocktails.json";
    private static final String WHEEL_RESOURCE_PATH = "data/cocktail_connection_wheel.json";

    private static final String FIELD_IS_VEGAN = "isVegan";
    private static final String FIELD_FLAVOR_PROFILES = "flavorProfiles";
    private static final String FIELD_ALLERGENS = "allergens";
    private static final String FIELD_INGREDIENTS = "ingredients";
    private static final String FIELD_QUANTITE = "quantite";
    private static final String FIELD_UNITE = "unite";
    private static final String FIELD_RECIPE_STEPS = "recipeSteps";
    private static final String FIELD_INGREDIENT_NOM = "ingredientNom";
    private static final String CATEGORY_OTHER = "other";

    private final CocktailRepository cocktailRepository;
    private final IngredientRepository ingredientRepository;
    private final CocktailIngredientRepository cocktailIngredientRepository;
    private final GlasswareRepository glasswareRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final ObjectMapper objectMapper;

    private final List<CocktailLibraryItemDTO> libraryItems = new ArrayList<>();
    private final Map<String, CocktailLibraryItemDTO> itemsById = new HashMap<>();
    private final Map<String, CocktailLibraryItemDTO> itemsByNameLower = new HashMap<>();
    private JsonNode wheelDataCache = null;

    /**
     * Constructs the library service with necessary repository and configuration dependencies.
     *
     * @param cocktailRepository           Repository for cocktails catalog
     * @param ingredientRepository         Repository for inventory ingredients
     * @param cocktailIngredientRepository Repository for cocktail-ingredient link entities
     * @param glasswareRepository          Repository for glassware presets
     * @param establishmentConfigService   Service for establishment capability toggles
     */
    public CocktailLibraryService(
            CocktailRepository cocktailRepository,
            IngredientRepository ingredientRepository,
            CocktailIngredientRepository cocktailIngredientRepository,
            GlasswareRepository glasswareRepository,
            EstablishmentConfigService establishmentConfigService) {
        this.cocktailRepository = cocktailRepository;
        this.ingredientRepository = ingredientRepository;
        this.cocktailIngredientRepository = cocktailIngredientRepository;
        this.glasswareRepository = glasswareRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.objectMapper = JsonMapper.builder()
                .enable(JsonReadFeature.ALLOW_NON_NUMERIC_NUMBERS)
                .build();
    }

    /**
     * Initializes the in-memory cocktail library cache from embedded JSON resource on application startup.
     */
    @PostConstruct
    public void initLibrary() {
        loadLibrary();
    }

    /**
     * Reloads the library catalog from JSON resource.
     */
    public synchronized void loadLibrary() {
        libraryItems.clear();
        itemsById.clear();
        itemsByNameLower.clear();

        InputStream is = loadResourceStream(LIBRARY_RESOURCE_PATH);
        if (is == null) {
            log.warn("Primary library resource '{}' not found, attempting fallback to '{}'", LIBRARY_RESOURCE_PATH, FALLBACK_RESOURCE_PATH);
            is = loadResourceStream(FALLBACK_RESOURCE_PATH);
        }

        if (is == null) {
            log.error("Unable to locate cocktail library dataset asset in classpath.");
            return;
        }

        try (InputStream stream = is) {
            JsonNode root = objectMapper.readTree(stream);
            JsonNode cocktailsNode = root.get("cocktails");
            if (cocktailsNode != null && cocktailsNode.isArray()) {
                int index = 1;
                for (JsonNode node : cocktailsNode) {
                    CocktailLibraryItemDTO item = parseLibraryItem(node, index++);
                    if (item != null) {
                        libraryItems.add(item);
                        itemsById.put(item.id(), item);
                        itemsByNameLower.put(item.nom().toLowerCase().trim(), item);
                    }
                }
            }
            log.info("Loaded {} recipes into cocktail library cache.", libraryItems.size());
        } catch (Exception e) {
            log.error("Failed to parse cocktail library dataset", e);
        }
    }

    /**
     * Retrieves the interactive connection wheel dataset (nodes, categorized taxonomy, and ingredient association matrix).
     *
     * @return JsonNode containing precomputed connection wheel data
     */
    @Transactional(readOnly = true)
    public JsonNode getWheelData() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);
        if (wheelDataCache != null) {
            return wheelDataCache;
        }
        try {
            ClassPathResource resource = new ClassPathResource(WHEEL_RESOURCE_PATH);
            if (resource.exists()) {
                wheelDataCache = objectMapper.readTree(resource.getInputStream());
                return wheelDataCache;
            }
        } catch (Exception e) {
            log.error("Failed to load connection wheel dataset from '{}'", WHEEL_RESOURCE_PATH, e);
        }
        return objectMapper.createObjectNode();
    }

    /**
     * Retrieves cocktail library templates matching optional search and facet filter criteria.
     *
     * @param category   Optional category filter (e.g. "IBA_CLASSICS", "TROPICAL", "MOCKTAILS", "ALCOOLISE")
     * @param baseSpirit Optional base spirit filter (e.g. "GIN", "VODKA", "RUM", "TEQUILA", "WHISKEY", "NON_ALCOHOLIC")
     * @param flavor     Optional flavor profile filter (e.g. "FRUITY", "SOUR", "SWEET", "BITTER", "SPICY", "HERBAL", "SMOKY")
     * @param mocktail   Optional boolean flag filtering for mocktails
     * @param search     Optional free-text search matching cocktail name or description
     * @return List of matching library cocktail templates
     */
    @Transactional(readOnly = true)
    public List<CocktailLibraryItemDTO> getLibrary(
            String category,
            String baseSpirit,
            String flavor,
            Boolean mocktail,
            String search) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);

        return libraryItems.stream()
                .filter(item -> filterByCategory(item, category))
                .filter(item -> filterByBaseSpirit(item, baseSpirit))
                .filter(item -> filterByFlavor(item, flavor))
                .filter(item -> filterByMocktail(item, mocktail))
                .filter(item -> filterBySearch(item, search))
                .toList();
    }

    /**
     * Batch imports selected library cocktail recipes into the active establishment catalog and inventory.
     * Automatically performs deduplication on cocktails and ingredient inventory items.
     *
     * @param request Import request specifying cocktail IDs or names
     * @return Detailed import result summary
     */
    private static class ImportStats {
        int importedCount = 0;
        int skippedCount = 0;
        int newIngredientsCount = 0;
        int reusedIngredientsCount = 0;
        final List<String> importedCocktails = new ArrayList<>();
        final List<String> skippedCocktails = new ArrayList<>();
    }

    @Transactional
    public CocktailLibraryImportResultDTO importCocktails(CocktailLibraryImportRequestDTO request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);

        Set<CocktailLibraryItemDTO> targets = resolveTargetCocktails(request);
        List<Glassware> allGlassware = glasswareRepository.findAll();
        ImportStats stats = new ImportStats();

        for (CocktailLibraryItemDTO template : targets) {
            importSingleTemplateCocktail(template, allGlassware, stats);
        }

        String summary = String.format("Successfully imported %d cocktails (%d skipped, %d new ingredients created, %d ingredients reused).",
                stats.importedCount, stats.skippedCount, stats.newIngredientsCount, stats.reusedIngredientsCount);

        return new CocktailLibraryImportResultDTO(
                stats.importedCount,
                stats.skippedCount,
                stats.newIngredientsCount,
                stats.reusedIngredientsCount,
                stats.importedCocktails,
                stats.skippedCocktails,
                summary
        );
    }

    private void importSingleTemplateCocktail(
            CocktailLibraryItemDTO template,
            List<Glassware> allGlassware,
            ImportStats stats) {
        if (cocktailRepository.findByNomIgnoreCase(template.nom().trim()).isPresent()) {
            stats.skippedCount++;
            stats.skippedCocktails.add(template.nom());
            return;
        }

        Cocktail cocktail = createCocktailEntity(template, allGlassware);
        Cocktail savedCocktail = cocktailRepository.save(cocktail);

        Map<String, Ingredient> resolvedIngredientsByName = new HashMap<>();
        List<CocktailIngredient> links = linkTemplateIngredients(savedCocktail, template.ingredients(), resolvedIngredientsByName, stats);
        savedCocktail.setIngredients(links);

        List<CocktailRecipeStep> steps = createRecipeSteps(savedCocktail, template.recipeSteps(), resolvedIngredientsByName);
        savedCocktail.setRecipeSteps(steps);

        cocktailRepository.save(savedCocktail);
        stats.importedCount++;
        stats.importedCocktails.add(savedCocktail.getNom());
    }

    private List<CocktailIngredient> linkTemplateIngredients(
            Cocktail savedCocktail,
            List<CocktailLibraryIngredientDTO> ingredientDTOs,
            Map<String, Ingredient> resolvedIngredientsByName,
            ImportStats stats) {
        List<CocktailIngredient> links = new ArrayList<>();
        for (CocktailLibraryIngredientDTO ingDTO : ingredientDTOs) {
            Ingredient resolved = resolveTemplateIngredient(ingDTO, stats);
            resolvedIngredientsByName.put(ingDTO.nom().trim().toLowerCase(), resolved);

            CocktailIngredient link = new CocktailIngredient();
            link.setCocktail(savedCocktail);
            link.setIngredient(resolved);
            link.setQuantite(ingDTO.quantite() != null ? ingDTO.quantite() : BigDecimal.ONE);
            link.setUnite(ingDTO.unite() != null ? ingDTO.unite() : "cl");
            links.add(cocktailIngredientRepository.save(link));
        }
        return links;
    }

    private Ingredient resolveTemplateIngredient(CocktailLibraryIngredientDTO ingDTO, ImportStats stats) {
        String ingName = ingDTO.nom().trim();
        Optional<Ingredient> existingOpt = ingredientRepository.findByNomIgnoreCase(ingName);

        if (existingOpt.isPresent()) {
            Ingredient existing = existingOpt.get();
            if (ingDTO.category() != null && !ingDTO.category().isBlank() && !CATEGORY_OTHER.equalsIgnoreCase(ingDTO.category())
                    && CATEGORY_OTHER.equalsIgnoreCase(existing.getCategory())) {
                existing.setCategory(ingDTO.category());
                existing = ingredientRepository.save(existing);
            }
            stats.reusedIngredientsCount++;
            return existing;
        }

        Ingredient newIng = createNewIngredient(ingDTO);
        stats.newIngredientsCount++;
        return ingredientRepository.save(newIng);
    }

    private Set<CocktailLibraryItemDTO> resolveTargetCocktails(CocktailLibraryImportRequestDTO request) {
        Set<CocktailLibraryItemDTO> targets = new LinkedHashSet<>();
        addTargetIds(request.cocktailIds(), targets);
        addTargetNames(request.cocktailNames(), targets);
        return targets;
    }

    private void addTargetIds(List<String> ids, Set<CocktailLibraryItemDTO> targets) {
        if (ids != null) {
            for (String id : ids) {
                CocktailLibraryItemDTO item = itemsById.get(id);
                if (item != null) {
                    targets.add(item);
                }
            }
        }
    }

    private void addTargetNames(List<String> names, Set<CocktailLibraryItemDTO> targets) {
        if (names != null) {
            for (String name : names) {
                if (name != null) {
                    CocktailLibraryItemDTO item = itemsByNameLower.get(name.toLowerCase().trim());
                    if (item != null) {
                        targets.add(item);
                    }
                }
            }
        }
    }

    private Cocktail createCocktailEntity(CocktailLibraryItemDTO template, List<Glassware> allGlassware) {
        Cocktail cocktail = new Cocktail();
        cocktail.setNom(template.nom().trim());
        cocktail.setDescription(template.description());
        cocktail.setPrix(template.prix() != null && template.prix().compareTo(BigDecimal.ZERO) > 0
                ? template.prix()
                : BigDecimal.valueOf(9.00));
        cocktail.setCategorie(resolveCategory(template.categorie(), template.isMocktail()));
        cocktail.setVatRate(template.isMocktail() ? VatRate.TEN : VatRate.TWENTY);
        cocktail.setStation(resolveStation(template.nom()));
        cocktail.setDisponible(true);
        cocktail.setAlcoholLevel(template.alcoholLevel() != null ? template.alcoholLevel() : BigDecimal.ZERO);
        cocktail.setMocktail(template.isMocktail());
        cocktail.setVegan(template.isVegan());
        cocktail.setGlutenFree(template.isGlutenFree());
        cocktail.setImageUrl(template.imageUrl());
        cocktail.setInstructions(template.instructions());
        cocktail.setGlassware(resolveGlassware(template.glassware(), allGlassware));
        cocktail.setFlavorProfiles(resolveFlavorProfiles(template.flavorProfiles()));
        return cocktail;
    }

    private Ingredient createNewIngredient(CocktailLibraryIngredientDTO dto) {
        Ingredient ing = new Ingredient();
        ing.setNom(dto.nom().trim());
        ing.setUniteMesure(dto.unite() != null && !dto.unite().isBlank() ? dto.unite() : "cl");

        boolean isUnit = "u".equalsIgnoreCase(dto.unite()) || "piece".equalsIgnoreCase(dto.unite());
        ing.setQuantiteStock(BigDecimal.valueOf(isUnit ? 20.0 : 100.0));
        ing.setSeuilAlerte(BigDecimal.valueOf(isUnit ? 5.0 : 20.0));
        ing.setPrixUnitaire(dto.coutUnitaire() != null && dto.coutUnitaire().compareTo(BigDecimal.ZERO) > 0
                ? dto.coutUnitaire()
                : BigDecimal.valueOf(0.50));
        ing.setDegreAlcool(dto.degreAlcool() != null ? dto.degreAlcool() : BigDecimal.ZERO);
        ing.setIsVegan(dto.isVegan());
        ing.setAllergens(resolveAllergens(dto.allergens()));
        ing.setCategory(dto.category() != null && !dto.category().isBlank() ? dto.category() : CATEGORY_OTHER);
        return ing;
    }

    private List<CocktailRecipeStep> createRecipeSteps(
            Cocktail cocktail,
            List<CocktailLibraryRecipeStepDTO> stepDTOs,
            Map<String, Ingredient> resolvedIngredients) {
        List<CocktailRecipeStep> steps = new ArrayList<>();
        if (stepDTOs == null) {
            return steps;
        }

        int order = 1;
        for (CocktailLibraryRecipeStepDTO s : stepDTOs) {
            steps.add(buildSingleRecipeStep(cocktail, s, order++, resolvedIngredients));
        }
        return steps;
    }

    private CocktailRecipeStep buildSingleRecipeStep(
            Cocktail cocktail,
            CocktailLibraryRecipeStepDTO s,
            int defaultOrder,
            Map<String, Ingredient> resolvedIngredients) {
        CocktailRecipeStep step = new CocktailRecipeStep();
        step.setCocktail(cocktail);
        step.setStepOrder(s.stepOrder() != null ? s.stepOrder() : defaultOrder);
        step.setActionTitle(s.actionTitle() != null ? s.actionTitle() : "ACTION");
        step.setCustomText(s.customText());
        step.setDurationSeconds(s.durationSeconds() != null ? s.durationSeconds() : 15);

        if ("INGREDIENT".equalsIgnoreCase(s.stepType()) && s.ingredientNom() != null) {
            step.setStepType(RecipeStepType.INGREDIENT);
            Ingredient linked = resolvedIngredients.get(s.ingredientNom().toLowerCase().trim());
            if (linked != null) {
                step.setIngredient(linked);
            }
            step.setQuantite(s.quantite() != null ? s.quantite().setScale(2, RoundingMode.HALF_UP) : null);
            step.setUnite(s.unite());
        } else {
            step.setStepType(RecipeStepType.CUSTOM_TEXT);
        }
        return step;
    }

    private PreparationStation resolveStation(String nom) {
        if (nom != null) {
            String lower = nom.toLowerCase();
            if (lower.contains("planche") || lower.contains("fromage") || lower.contains("charcuterie")
                    || lower.contains("snack") || lower.contains("tapas") || lower.contains("nachos")) {
                return PreparationStation.SNACK;
            }
            if (lower.contains("frites") || lower.contains("burger") || lower.contains("pizza")
                    || lower.contains("plat") || lower.contains("chaud") || lower.contains("cuisine")) {
                return PreparationStation.KITCHEN;
            }
        }
        return PreparationStation.BAR;
    }

    private CocktailCategorie resolveCategory(String catStr, boolean isMocktail) {
        if (catStr != null) {
            try {
                return CocktailCategorie.valueOf(catStr.trim().toUpperCase());
            } catch (Exception _) {
                // fallback
            }
        }
        return isMocktail ? CocktailCategorie.SANS_ALCOOL : CocktailCategorie.ALCOOLISE;
    }

    private Glassware resolveGlassware(String glassName, List<Glassware> all) {
        if (all == null || all.isEmpty()) {
            return null;
        }
        String search = glassName != null ? glassName.toLowerCase() : "";
        for (Glassware g : all) {
            if (g.getNom().equalsIgnoreCase(glassName) || g.getNom().toLowerCase().contains(search)) {
                return g;
            }
        }
        return all.get(0);
    }

    private Set<FlavorProfile> resolveFlavorProfiles(List<String> list) {
        Set<FlavorProfile> set = new HashSet<>();
        if (list != null) {
            for (String str : list) {
                try {
                    set.add(FlavorProfile.valueOf(str.trim().toUpperCase()));
                } catch (Exception _) {
                    // ignore unrecognized
                }
            }
        }
        if (set.isEmpty()) {
            set.add(FlavorProfile.FRUITY);
        }
        return set;
    }

    private Set<Allergen> resolveAllergens(List<String> list) {
        Set<Allergen> set = new HashSet<>();
        if (list != null) {
            for (String str : list) {
                try {
                    set.add(Allergen.valueOf(str.trim().toUpperCase()));
                } catch (Exception _) {
                    // ignore unrecognized
                }
            }
        }
        return set;
    }

    private boolean filterByCategory(CocktailLibraryItemDTO item, String category) {
        if (category == null || category.isBlank() || "ALL".equalsIgnoreCase(category)) {
            return true;
        }
        String catUpper = category.trim().toUpperCase();
        return catUpper.equalsIgnoreCase(item.libraryCategory()) || catUpper.equalsIgnoreCase(item.categorie());
    }

    private boolean filterByBaseSpirit(CocktailLibraryItemDTO item, String spirit) {
        if (spirit == null || spirit.isBlank() || "ALL".equalsIgnoreCase(spirit)) {
            return true;
        }
        return spirit.trim().equalsIgnoreCase(item.baseSpirit());
    }

    private boolean filterByFlavor(CocktailLibraryItemDTO item, String flavor) {
        if (flavor == null || flavor.isBlank() || "ALL".equalsIgnoreCase(flavor)) {
            return true;
        }
        String flUpper = flavor.trim().toUpperCase();
        return item.flavorProfiles() != null && item.flavorProfiles().stream()
                .anyMatch(f -> f.equalsIgnoreCase(flUpper));
    }

    private boolean filterByMocktail(CocktailLibraryItemDTO item, Boolean mocktail) {
        if (mocktail == null) {
            return true;
        }
        return mocktail.equals(item.isMocktail());
    }

    private boolean filterBySearch(CocktailLibraryItemDTO item, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String q = search.toLowerCase().trim();
        return (item.nom() != null && item.nom().toLowerCase().contains(q))
                || (item.description() != null && item.description().toLowerCase().contains(q))
                || (item.tags() != null && item.tags().stream().anyMatch(t -> t.toLowerCase().contains(q)));
    }

    private List<String> parseStringList(JsonNode node, String fieldName) {
        List<String> list = new ArrayList<>();
        if (node.has(fieldName) && node.get(fieldName).isArray()) {
            node.get(fieldName).forEach(item -> list.add(item.asText()));
        }
        return list;
    }

    private String getTextOrDefault(JsonNode node, String field, String defaultValue) {
        JsonNode child = node.get(field);
        return child != null && !child.isNull() ? child.asText() : defaultValue;
    }

    private BigDecimal getBigDecimalOrDefault(JsonNode node, String field, double defaultValue) {
        JsonNode child = node.get(field);
        return BigDecimal.valueOf(child != null && !child.isNull() ? child.asDouble() : defaultValue);
    }

    private boolean getBooleanOrDefault(JsonNode node, String field, boolean defaultValue) {
        JsonNode child = node.get(field);
        return child != null && !child.isNull() ? child.asBoolean() : defaultValue;
    }

    private int getIntOrDefault(JsonNode node, String field, int defaultValue) {
        JsonNode child = node.get(field);
        return child != null && !child.isNull() ? child.asInt() : defaultValue;
    }

    private CocktailLibraryIngredientDTO parseSingleIngredient(JsonNode ingNode) {
        String ingNom = getTextOrDefault(ingNode, "nom", "");
        BigDecimal qte = getBigDecimalOrDefault(ingNode, FIELD_QUANTITE, 1.0);
        String unite = getTextOrDefault(ingNode, FIELD_UNITE, "cl");
        String category = getTextOrDefault(ingNode, "category", CATEGORY_OTHER);
        BigDecimal abv = getBigDecimalOrDefault(ingNode, "degreAlcool", 0.0);
        BigDecimal cost = getBigDecimalOrDefault(ingNode, "coutUnitaire", 0.50);
        boolean vegan = getBooleanOrDefault(ingNode, FIELD_IS_VEGAN, true);
        return new CocktailLibraryIngredientDTO(ingNom, qte, unite, category, abv, cost, Collections.emptyList(), vegan);
    }

    private List<CocktailLibraryIngredientDTO> parseIngredients(JsonNode node) {
        List<CocktailLibraryIngredientDTO> ingredients = new ArrayList<>();
        JsonNode ingArray = node.get(FIELD_INGREDIENTS);
        if (ingArray != null && ingArray.isArray()) {
            for (JsonNode ingNode : ingArray) {
                ingredients.add(parseSingleIngredient(ingNode));
            }
        }
        return ingredients;
    }

    private CocktailLibraryRecipeStepDTO parseSingleRecipeStep(JsonNode stepNode) {
        int stepOrder = getIntOrDefault(stepNode, "stepOrder", 1);
        String stepType = getTextOrDefault(stepNode, "stepType", "CUSTOM_TEXT");
        String actionTitle = getTextOrDefault(stepNode, "actionTitle", "");
        String ingNom = stepNode.hasNonNull(FIELD_INGREDIENT_NOM) ? stepNode.get(FIELD_INGREDIENT_NOM).asText() : null;
        BigDecimal stepQte = stepNode.hasNonNull(FIELD_QUANTITE) ? BigDecimal.valueOf(stepNode.get(FIELD_QUANTITE).asDouble()) : null;
        String stepUnite = stepNode.hasNonNull(FIELD_UNITE) ? stepNode.get(FIELD_UNITE).asText() : null;
        String stepDesc = getTextOrDefault(stepNode, "customText", "");
        int dur = getIntOrDefault(stepNode, "durationSeconds", 15);
        return new CocktailLibraryRecipeStepDTO(stepOrder, stepType, actionTitle, ingNom, stepQte, stepUnite, stepDesc, dur);
    }

    private List<CocktailLibraryRecipeStepDTO> parseRecipeSteps(JsonNode node) {
        List<CocktailLibraryRecipeStepDTO> steps = new ArrayList<>();
        JsonNode stepArray = node.get(FIELD_RECIPE_STEPS);
        if (stepArray != null && stepArray.isArray()) {
            for (JsonNode stepNode : stepArray) {
                steps.add(parseSingleRecipeStep(stepNode));
            }
        }
        return steps;
    }

    private CocktailLibraryItemDTO parseLibraryItem(JsonNode node, int index) {
        try {
            String nom = getTextOrDefault(node, "nom", "Cocktail " + index).trim();
            String id = getTextOrDefault(node, "id", "lib_" + index);
            String desc = getTextOrDefault(node, "description", "");
            String cat = getTextOrDefault(node, "categorie", "ALCOOLISE");
            String libCat = getTextOrDefault(node, "libraryCategory", "CONTEMPORARY");
            String baseSpirit = getTextOrDefault(node, "baseSpirit", "OTHER");
            boolean iba = getBooleanOrDefault(node, "ibaOfficial", false);
            BigDecimal prix = getBigDecimalOrDefault(node, "prix", 9.00);
            BigDecimal alcoholLevel = getBigDecimalOrDefault(node, "alcoholLevel", 0.0);
            boolean isMocktail = getBooleanOrDefault(node, "isMocktail", false);
            boolean isVegan = getBooleanOrDefault(node, FIELD_IS_VEGAN, true);
            boolean isGlutenFree = getBooleanOrDefault(node, "isGlutenFree", true);
            String glassware = getTextOrDefault(node, "glassware", "Tumbler");
            String glasswareImage = getTextOrDefault(node, "glasswareImage", "");
            String imageUrl = getTextOrDefault(node, "imageUrl", "");
            int prepTime = getIntOrDefault(node, "preparationTimeSeconds", 60);
            String instructions = getTextOrDefault(node, "instructions", "");
            int popularityScore = getIntOrDefault(node, "popularityScore", 30);
            boolean isPopular = getBooleanOrDefault(node, "isPopular", false);
            String variantFamily = node.hasNonNull("variantFamily") ? node.get("variantFamily").asText() : null;
            String variationOf = node.hasNonNull("variationOf") ? node.get("variationOf").asText() : null;

            List<String> flavors = parseStringList(node, FIELD_FLAVOR_PROFILES);
            List<String> allergens = parseStringList(node, FIELD_ALLERGENS);
            List<String> tags = parseStringList(node, "tags");
            List<CocktailLibraryIngredientDTO> ingredients = parseIngredients(node);
            List<CocktailLibraryRecipeStepDTO> steps = parseRecipeSteps(node);

            return new CocktailLibraryItemDTO(
                    id, nom, desc, cat, libCat, baseSpirit, iba, prix, alcoholLevel,
                    isMocktail, isVegan, isGlutenFree, glassware, glasswareImage, imageUrl,
                    flavors, allergens, prepTime, tags, ingredients, steps, instructions,
                    popularityScore, isPopular, variantFamily, variationOf
            );
        } catch (Exception e) {
            log.error("Failed to parse library cocktail node: {}", node, e);
            return null;
        }
    }

    private InputStream loadResourceStream(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            if (resource.exists()) {
                return resource.getInputStream();
            }
        } catch (Exception e) {
            log.debug("ClassPathResource failed for '{}'", path, e);
        }

        ClassLoader contextCL = Thread.currentThread().getContextClassLoader();
        if (contextCL != null) {
            InputStream is = contextCL.getResourceAsStream(path);
            if (is != null) return is;
        }

        InputStream is = CocktailLibraryService.class.getClassLoader().getResourceAsStream(path);
        if (is != null) return is;

        return CocktailLibraryService.class.getResourceAsStream("/" + path);
    }
}
