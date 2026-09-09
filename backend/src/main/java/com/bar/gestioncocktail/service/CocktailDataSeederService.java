package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Service responsible for automatically seeding the database with the cocktail
 * dataset ONLY in the dev/test environment if the database contains no cocktails on startup.
 */
@Service
@DependsOn("glasswareDataSeederService")
@Profile({"dev", "test", "staging"})
public class CocktailDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(CocktailDataSeederService.class);
    private static final String DATASET_PATH = "data/cocktails_list.json";

    private static final String KEY_ECONOMIE = "economie";
    private static final String KEY_MEDIA = "media";
    private static final String KEY_MATERIEL = "materiel";
    private static final String KEY_SPECIFICATION = "specification";
    private static final String KEY_VERRE = "verre";
    private static final String KEY_RECETTE_ULTRA_DETAILLEE = "recette_ultra_detaillee";
    private static final String KEY_DESCRIPTION = "description";
    private static final String KEY_QUANTITE = "quantite";
    private static final String KEY_UNITE = "unite";
    private static final String KEY_ACTION = "action";
    private static final String KEY_INGREDIENT = "ingredient";
    private static final String KEY_CHAMPAGNE = "champagne";
    private static final String KEY_DISPONIBLE = "disponible";
    private static final String KEY_WHISKY = "whisky";
    private static final String KEY_APEROL = "aperol";
    private static final String KEY_BIERE = "bière";
    private static final String KEY_BIERE_ASCII = "biere";
    private static final String KEY_BAILEYS = "baileys";
    private static final String KEY_WHISKEY = "whiskey";
    private static final String KEY_MARTINI = "martini";
    private static final String KEY_CAMPARI = "campari";
    private static final String KEY_COCKTAILS = "cocktails";
    private static final String KEY_INGREDIENTS = "ingredients";
    private static final String KEY_ALLERGENS = "allergens";
    private static final String KEY_FLAVOR_PROFILES = "flavor_profiles";

    private static final Set<String> ALCOHOL_KEYWORDS = Set.of(
            "rhum", "vodka", "gin", "tequila", KEY_WHISKY, KEY_WHISKEY, "calvados", "cognac", "armagnac",
            "liqueur", "cointreau", "triple sec", KEY_MARTINI, KEY_CAMPARI, KEY_APEROL, KEY_BIERE, "vin",
            "prosecco", KEY_CHAMPAGNE, "kahlua", KEY_BAILEYS, "get", "manzana", "pastis", "ricard",
            "angostura", "bourbon", "absinthe", "amaretto", "malibu", "chartreuse", "suze");

    private final CocktailRepository cocktailRepository;
    private final IngredientRepository ingredientRepository;
    private final CocktailIngredientRepository cocktailIngredientRepository;
    private final CocktailVarianteRepository cocktailVarianteRepository;
    private final GlasswareRepository glasswareRepository;
    private final org.springframework.core.env.Environment environment;
    private final ObjectMapper objectMapper;

    /**
     * Constructs the cocktail data seeder service with repository and environment dependencies.
     *
     * @param cocktailRepository JPA cocktail repository
     * @param ingredientRepository JPA ingredient repository
     * @param cocktailIngredientRepository JPA cocktail-ingredient relation repository
     * @param cocktailVarianteRepository JPA cocktail variation repository
     * @param glasswareRepository JPA glassware repository
     * @param environment Spring environment to inspect active profiles
     */
    public CocktailDataSeederService(
            CocktailRepository cocktailRepository,
            IngredientRepository ingredientRepository,
            CocktailIngredientRepository cocktailIngredientRepository,
            CocktailVarianteRepository cocktailVarianteRepository,
            GlasswareRepository glasswareRepository,
            org.springframework.core.env.Environment environment) {
        this.cocktailRepository = cocktailRepository;
        this.ingredientRepository = ingredientRepository;
        this.cocktailIngredientRepository = cocktailIngredientRepository;
        this.cocktailVarianteRepository = cocktailVarianteRepository;
        this.glasswareRepository = glasswareRepository;
        this.environment = environment;
        this.objectMapper = JsonMapper.builder()
                .enable(JsonReadFeature.ALLOW_NON_NUMERIC_NUMBERS)
                .build();
    }

    /**
     * Executes automatic dataset seeding on startup ONLY when running with the 'test' profile.
     * In 'dev' and 'prod' profiles, automatic startup seeding is skipped to maintain a clean blank database.
     */
    @PostConstruct
    @Transactional
    public void seedCocktailsIfEmpty() {
        fixLegacyImageUrls();
        ensureFlavorProfilesPopulated();
        ensureIngredientAllergensPopulated();
        if (!isTestProfileActive()) {
            log.info("Skipping automatic cocktail startup seeding (active profile is not 'test'). Database remains clean.");
            return;
        }
        seedCocktailsInternal(false);
    }

    /**
     * Seeds or refreshes cocktail catalog data.
     *
     * @param force When true, proceeds even if cocktails are already present
     */
    @Transactional
    public void seedCocktails(boolean force) {
        fixLegacyImageUrls();
        ensureFlavorProfilesPopulated();
        ensureIngredientAllergensPopulated();
        if (!force && cocktailRepository.count() > 0) {
            log.info("Database already contains cocktails, skipping seeding.");
            return;
        }
        seedCocktailsInternal(force);
    }

    private void seedCocktailsInternal(boolean force) {
        if (!force && cocktailRepository.count() > 0) {
            log.info("Database already contains cocktails, skipping test dataset seeding.");
            return;
        }

        InputStream is = loadResourceStream();
        if (is == null) {
            log.warn("Dataset resource file '{}' not found in classpath.", DATASET_PATH);
            return;
        }

        try (InputStream stream = is) {
            JsonNode root = objectMapper.readTree(stream);
            JsonNode cocktailsNode = root.get(KEY_COCKTAILS);
            if (cocktailsNode == null || !cocktailsNode.isArray()) {
                log.warn("Invalid cocktail JSON dataset format.");
                return;
            }

            List<Glassware> allGlassware = glasswareRepository.findAll();
            int importedCount = 0;
            for (JsonNode node : cocktailsNode) {
                if (importSingleCocktail(node, allGlassware)) {
                    importedCount++;
                }
            }
            log.info("Successfully seeded database with {} cocktails from test dataset.", importedCount);
        } catch (Exception e) {
            log.error("Failed to seed cocktail test dataset", e);
        }
    }

    private boolean isTestProfileActive() {
        if (environment == null) {
            return false;
        }
        return java.util.Arrays.asList(environment.getActiveProfiles()).contains("test");
    }

    private void fixLegacyImageUrls() {
        try {
            List<Cocktail> existing = cocktailRepository.findAll();
            for (Cocktail c : existing) {
                if (c.getImageUrl() != null && c.getImageUrl().contains("assets/images/cocktails/")) {
                    c.setImageUrl("assets/images/verres/verre_tumbler.png");
                    cocktailRepository.save(c);
                }
            }
        } catch (Exception _) {
            // Ignored if DB table not yet populated
        }
    }

    private InputStream loadResourceStream() {
        try {
            ClassPathResource resource = new ClassPathResource(DATASET_PATH);
            if (resource.exists()) {
                return resource.getInputStream();
            }
        } catch (Exception e) {
            log.debug("ClassPathResource failed, trying Thread context classloader", e);
        }

        ClassLoader contextCL = Thread.currentThread().getContextClassLoader();
        if (contextCL != null) {
            InputStream is = contextCL.getResourceAsStream(DATASET_PATH);
            if (is != null)
                return is;
        }

        InputStream is = CocktailDataSeederService.class.getClassLoader().getResourceAsStream(DATASET_PATH);
        if (is != null)
            return is;

        return CocktailDataSeederService.class.getResourceAsStream("/" + DATASET_PATH);
    }

    private boolean importSingleCocktail(JsonNode node, List<Glassware> allGlassware) {
        try {
            String nom = node.has("nom") ? node.get("nom").asText().trim() : null;
            if (nom == null || nom.isBlank() || cocktailRepository.findByNomIgnoreCase(nom).isPresent()) {
                return false;
            }

            Cocktail cocktail = buildBaseCocktail(node, nom, allGlassware);
            Cocktail savedCocktail = cocktailRepository.save(cocktail);

            JsonNode ingredientsNode = node.get(KEY_INGREDIENTS);
            List<CocktailIngredient> ingredientsList = importIngredients(savedCocktail, ingredientsNode);
            savedCocktail.setIngredients(ingredientsList);

            List<CocktailRecipeStep> steps = importRecipeSteps(savedCocktail, node);
            if (!steps.isEmpty()) {
                savedCocktail.setRecipeSteps(steps);
            }

            cocktailRepository.save(savedCocktail);
            importVariantes(savedCocktail, node.get("variantes"));
            return true;
        } catch (Exception e) {
            log.error("Error importing cocktail node: {}", node, e);
            return false;
        }
    }

    private Cocktail buildBaseCocktail(JsonNode node, String nom, List<Glassware> allGlassware) {
        Cocktail cocktail = new Cocktail();
        cocktail.setNom(nom);
        cocktail.setPrix(extractPrice(node));
        cocktail.setDescription(buildDescription(node));
        cocktail.setInstructions(buildInstructions(node));
        cocktail.setDisponible(!node.has(KEY_DISPONIBLE) || node.get(KEY_DISPONIBLE).asBoolean());

        applySeasonality(cocktail, node);
        applyMedia(cocktail, node);

        JsonNode ingredientsNode = node.get(KEY_INGREDIENTS);
        boolean containsAlcohol = detectAlcohol(ingredientsNode, nom);
        cocktail.setCategorie(detectCategory(node, containsAlcohol));
        cocktail.setVatRate(resolveVatRate(nom, containsAlcohol));
        cocktail.setGlassware(resolveGlassware(node, allGlassware));
        cocktail.setMocktail(resolveMocktail(node, containsAlcohol, cocktail.getCategorie()));
        cocktail.setAlcoholLevel(resolveAlcoholLevel(node, nom, containsAlcohol, cocktail.getCategorie()));
        cocktail.setVegan(resolveVegan(node, ingredientsNode));
        cocktail.setGlutenFree(resolveGlutenFree(node, ingredientsNode));
        cocktail.setFlavorProfiles(resolveFlavorProfiles(node, ingredientsNode, nom));
        cocktail.setStation(resolveStation(node, nom));
        return cocktail;
    }

    private PreparationStation resolveStation(JsonNode node, String nom) {
        if (node.has("station")) {
            try {
                return PreparationStation.valueOf(node.get("station").asText().trim().toUpperCase());
            } catch (Exception _) {
                // fallback
            }
        }
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

    private void applySeasonality(Cocktail cocktail, JsonNode node) {
        if (node.has("saisonnier") && node.get("saisonnier").asBoolean()) {
            cocktail.setSaisonnier(true);
            if (node.has("mois_debut")) {
                cocktail.setMoisDebut(node.get("mois_debut").asInt());
            }
            if (node.has("mois_fin")) {
                cocktail.setMoisFin(node.get("mois_fin").asInt());
            }
        }
    }

    private void applyMedia(Cocktail cocktail, JsonNode node) {
        if (node.has(KEY_MEDIA) && node.get(KEY_MEDIA).has("photo_url")) {
            String photoUrl = node.get(KEY_MEDIA).get("photo_url").asText();
            if (photoUrl != null && !photoUrl.isBlank()) {
                cocktail.setImageUrl(photoUrl);
            }
        }
    }

    private VatRate resolveVatRate(String nom, boolean containsAlcohol) {
        if (containsAlcohol) {
            return VatRate.TWENTY;
        }
        String lower = nom.toLowerCase();
        if (lower.contains("planche") || lower.contains("nachos") || lower.contains("frites") || lower.contains("snack")) {
            return VatRate.FIVE_FIVE;
        }
        return VatRate.TEN;
    }

    private Glassware resolveGlassware(JsonNode node, List<Glassware> allGlassware) {
        if (allGlassware == null || allGlassware.isEmpty()) {
            return null;
        }
        String verreName = "";
        if (node.has(KEY_MATERIEL) && node.get(KEY_MATERIEL).has(KEY_VERRE)) {
            verreName = node.get(KEY_MATERIEL).get(KEY_VERRE).asText().toLowerCase();
        }
        String cocktailNom = node.has("nom") ? node.get("nom").asText().toLowerCase() : "";

        String matchedName = matchGlasswarePreset(verreName, cocktailNom);
        return findGlasswareByKeyword(allGlassware, matchedName);
    }

    private String matchGlasswarePreset(String verre, String nom) {
        if (isCopperMug(verre, nom)) return "Tasse en cuivre";
        if (isMargaritaGlass(verre, nom)) return "Verre Margarita";
        if (isChampagneFlute(verre, nom)) return "Flûte à Champagne";
        if (isMartiniGlass(verre, nom)) return "Coupe à Cocktail / Martini";
        if (isCopaGlass(verre, nom)) return "Verre Ballon / Copa";
        if (isRocksGlass(verre, nom)) return "Verre Old Fashioned / Rocks";
        if (isTikiGlass(verre, nom)) return "Verre Tiki";
        if (isShotGlass(verre, nom)) return "Verre à Shot / Chupito";
        return "Verre Tumbler / Highball";
    }

    private boolean isCopperMug(String verre, String nom) {
        return verre.contains("tasse") || verre.contains("mug") || verre.contains("cuivre") || nom.contains("mule");
    }

    private boolean isMargaritaGlass(String verre, String nom) {
        return verre.contains("margarita") || nom.contains("margarita");
    }

    private boolean isChampagneFlute(String verre, String nom) {
        return verre.contains("flûte") || verre.contains("flute") || verre.contains(KEY_CHAMPAGNE) || nom.contains(KEY_CHAMPAGNE) || nom.contains("bellini") || nom.contains("mimosa");
    }

    private boolean isMartiniGlass(String verre, String nom) {
        return verre.contains(KEY_MARTINI) || verre.contains("coupe") || verre.contains("coupette") || nom.contains("cosmopolitan") || nom.contains("manhattan");
    }

    private boolean isCopaGlass(String verre, String nom) {
        return verre.contains("ballon") || verre.contains("copa") || nom.contains("spritz") || nom.contains("gin tonic");
    }

    private boolean isRocksGlass(String verre, String nom) {
        return verre.contains("old fashioned") || verre.contains("rocks") || verre.contains(KEY_WHISKY) || nom.contains("negroni") || nom.contains("old fashioned") || nom.contains("caïpirinha");
    }

    private boolean isTikiGlass(String verre, String nom) {
        return verre.contains("tiki") || nom.contains("tiki") || nom.contains("mai tai") || nom.contains("zombie");
    }

    private boolean isShotGlass(String verre, String nom) {
        return verre.contains("shot") || verre.contains("shooter") || verre.contains("chupito") || nom.contains("b-52") || nom.contains("shot");
    }

    private Glassware findGlasswareByKeyword(List<Glassware> all, String name) {
        return all.stream()
                .filter(g -> g.getNom().equalsIgnoreCase(name))
                .findFirst()
                .orElse(all.get(0));
    }

    private List<CocktailRecipeStep> importRecipeSteps(Cocktail savedCocktail, JsonNode node) {
        List<CocktailRecipeStep> steps = new ArrayList<>();
        if (!node.has(KEY_RECETTE_ULTRA_DETAILLEE) || !node.get(KEY_RECETTE_ULTRA_DETAILLEE).isArray()) {
            return steps;
        }

        JsonNode stepsNode = node.get(KEY_RECETTE_ULTRA_DETAILLEE);
        int order = 1;
        for (JsonNode stepNode : stepsNode) {
            steps.add(createRecipeStepFromNode(savedCocktail, stepNode, order++));
        }
        return steps;
    }

    private CocktailRecipeStep createRecipeStepFromNode(Cocktail savedCocktail, JsonNode stepNode, int order) {
        String action = stepNode.has(KEY_ACTION) ? stepNode.get(KEY_ACTION).asText() : "";
        String desc = stepNode.has(KEY_DESCRIPTION) ? stepNode.get(KEY_DESCRIPTION).asText() : "";
        CocktailRecipeStep step = new CocktailRecipeStep();
        step.setCocktail(savedCocktail);
        step.setStepOrder(order);

        if ("AJOUTER_INGREDIENT".equalsIgnoreCase(action)) {
            step.setStepType(RecipeStepType.INGREDIENT);
            if (stepNode.has(KEY_INGREDIENT)) {
                step.setIngredient(ingredientRepository.findByNomIgnoreCase(stepNode.get(KEY_INGREDIENT).asText()).orElse(null));
            }
            if (stepNode.has(KEY_QUANTITE)) {
                step.setQuantite(BigDecimal.valueOf(stepNode.get(KEY_QUANTITE).asDouble()).setScale(2, RoundingMode.HALF_UP));
            }
            if (stepNode.has(KEY_UNITE)) {
                step.setUnite(stepNode.get(KEY_UNITE).asText());
            }
            step.setCustomText(desc);
        } else {
            step.setStepType(RecipeStepType.CUSTOM_TEXT);
            step.setActionTitle(action);
            step.setCustomText(desc);
            step.setDurationSeconds(15);
        }
        return step;
    }

    private CocktailCategorie detectCategory(JsonNode node, boolean containsAlcohol) {
        if (node.hasNonNull("categorie")) {
            try {
                return CocktailCategorie.valueOf(node.get("categorie").asText().trim());
            } catch (IllegalArgumentException | NullPointerException _) {
                // fallback to automatic detection
            }
        }
        return containsAlcohol ? CocktailCategorie.ALCOOLISE : CocktailCategorie.SANS_ALCOOL;
    }

    private void importVariantes(Cocktail savedCocktail, JsonNode variantesNode) {
        if (variantesNode == null || !variantesNode.isArray()) {
            return;
        }
        for (JsonNode vNode : variantesNode) {
            CocktailVariante v = createVarianteFromNode(savedCocktail, vNode);
            if (v != null) {
                cocktailVarianteRepository.save(v);
            }
        }
    }

    private CocktailVariante createVarianteFromNode(Cocktail savedCocktail, JsonNode vNode) {
        String vNom = vNode.hasNonNull("nom") ? vNode.get("nom").asText().trim() : null;
        if (vNom == null || vNom.isBlank()) {
            return null;
        }

        CocktailVariante v = new CocktailVariante();
        v.setCocktail(savedCocktail);
        v.setNom(vNom);
        v.setDescription(vNode.hasNonNull(KEY_DESCRIPTION) ? vNode.get(KEY_DESCRIPTION).asText() : null);
        v.setPrixSupplement(extractBigDecimal(vNode, "prix_supplement", BigDecimal.ZERO));
        v.setMultiplicateurIngredient(extractBigDecimal(vNode, "multiplicateur_ingredient", BigDecimal.ONE));
        v.setDisponible(!vNode.hasNonNull(KEY_DISPONIBLE) || vNode.get(KEY_DISPONIBLE).asBoolean());
        v.setInstructions(vNode.hasNonNull("instructions") ? vNode.get("instructions").asText() : null);
        return v;
    }

    private BigDecimal extractBigDecimal(JsonNode node, String fieldName, BigDecimal defaultValue) {
        if (node.hasNonNull(fieldName)) {
            return BigDecimal.valueOf(node.get(fieldName).asDouble()).setScale(2, RoundingMode.HALF_UP);
        }
        return defaultValue;
    }

    private BigDecimal extractPrice(JsonNode node) {
        if (node.has(KEY_ECONOMIE) && node.get(KEY_ECONOMIE).has("prix_de_vente_eur")) {
            double rawPrice = node.get(KEY_ECONOMIE).get("prix_de_vente_eur").asDouble(8.50);
            if (rawPrice > 0 && !Double.isNaN(rawPrice) && !Double.isInfinite(rawPrice)) {
                return BigDecimal.valueOf(rawPrice).setScale(2, RoundingMode.HALF_UP);
            }
        }
        return BigDecimal.valueOf(8.50);
    }

    private List<CocktailIngredient> importIngredients(Cocktail savedCocktail, JsonNode ingredientsNode) {
        List<CocktailIngredient> list = new ArrayList<>();
        if (ingredientsNode == null || !ingredientsNode.isArray()) {
            return list;
        }

        for (JsonNode ingNode : ingredientsNode) {
            CocktailIngredient ci = processIngredientNode(savedCocktail, ingNode);
            if (ci != null) {
                list.add(ci);
            }
        }
        return list;
    }

    private CocktailIngredient processIngredientNode(Cocktail savedCocktail, JsonNode ingNode) {
        String ingNom = ingNode.has("nom") ? ingNode.get("nom").asText().trim() : null;
        if (ingNom == null || ingNom.isBlank()) {
            return null;
        }

        String unite = ingNode.has(KEY_UNITE) ? ingNode.get(KEY_UNITE).asText().trim() : "cl";
        BigDecimal qty = extractQuantity(ingNode);
        double costRaw = extractCost(ingNode);
        Set<Allergen> allergens = extractAllergens(ingNode);
        BigDecimal abv = extractAbv(ingNode);

        Ingredient ingredient = findOrCreateIngredient(ingNom, unite, costRaw, allergens, abv);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setCocktail(savedCocktail);
        ci.setIngredient(ingredient);
        ci.setQuantite(qty);
        ci.setUnite(unite.isEmpty() || unite.equalsIgnoreCase("nan") ? "cl" : unite);
        return cocktailIngredientRepository.save(ci);
    }

    private BigDecimal extractAbv(JsonNode node) {
        if (node.hasNonNull("degre_alcool")) {
            return BigDecimal.valueOf(node.get("degre_alcool").asDouble()).setScale(1, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal extractQuantity(JsonNode node) {
        double qtyRaw = node.has(KEY_QUANTITE) ? node.get(KEY_QUANTITE).asDouble(1.0) : 1.0;
        if (Double.isNaN(qtyRaw) || Double.isInfinite(qtyRaw)) {
            qtyRaw = 1.0;
        }
        return BigDecimal.valueOf(qtyRaw).setScale(2, RoundingMode.HALF_UP);
    }

    private double extractCost(JsonNode node) {
        double costRaw = node.has("cout_eur") ? node.get("cout_eur").asDouble(0.0) : 0.0;
        if (Double.isNaN(costRaw) || Double.isInfinite(costRaw)) {
            return 0.0;
        }
        return costRaw;
    }

    private Set<Allergen> extractAllergens(JsonNode ingNode) {
        if (!ingNode.has(KEY_ALLERGENS) || !ingNode.get(KEY_ALLERGENS).isArray()) {
            return Collections.emptySet();
        }
        Set<Allergen> allergens = new HashSet<>();
        for (JsonNode aNode : ingNode.get(KEY_ALLERGENS)) {
            parseAllergen(aNode.asText().trim()).ifPresent(allergens::add);
        }
        return allergens;
    }

    private Optional<Allergen> parseAllergen(String raw) {
        try {
            return Optional.of(Allergen.valueOf(raw.toUpperCase(java.util.Locale.ROOT)));
        } catch (IllegalArgumentException _) {
            return Optional.empty();
        }
    }

    private Ingredient findOrCreateIngredient(String ingNom, String unite, double costRaw, Set<Allergen> allergens, BigDecimal abv) {
        return ingredientRepository.findByNomIgnoreCase(ingNom)
                .map(existing -> updateExistingIngredient(existing, allergens, abv))
                .orElseGet(() -> createNewIngredient(ingNom, unite, costRaw, allergens, abv));
    }

    private Ingredient updateExistingIngredient(Ingredient existing, Set<Allergen> allergens, BigDecimal abv) {
        boolean modified = false;
        if (allergens != null && !allergens.isEmpty()
                && (existing.getAllergens() == null || existing.getAllergens().isEmpty())) {
            existing.setAllergens(allergens);
            modified = true;
        }
        if (abv != null && abv.compareTo(BigDecimal.ZERO) > 0 && (existing.getDegreAlcool() == null || existing.getDegreAlcool().compareTo(BigDecimal.ZERO) == 0)) {
            existing.setDegreAlcool(abv);
            modified = true;
        }
        if (allergens != null && (allergens.contains(Allergen.LAIT) || allergens.contains(Allergen.OEUF))) {
            existing.setIsVegan(false);
            modified = true;
        }
        return modified ? ingredientRepository.save(existing) : existing;
    }

    private Ingredient createNewIngredient(String ingNom, String unite, double costRaw, Set<Allergen> allergens, BigDecimal abv) {
        Ingredient newIng = new Ingredient();
        newIng.setNom(ingNom);
        newIng.setUniteMesure(unite.isEmpty() || unite.equalsIgnoreCase("nan") ? "cl" : unite);
        newIng.setQuantiteStock(BigDecimal.valueOf(100.0));
        newIng.setSeuilAlerte(BigDecimal.valueOf(10.0));
        newIng.setPrixUnitaire(BigDecimal.valueOf(costRaw > 0 ? costRaw : 0.50).setScale(4, RoundingMode.HALF_UP));
        newIng.setFournisseur("Fournisseur Boissons & Primeurs");
        newIng.setDatePeremption(LocalDateTime.now(java.time.ZoneId.of("Europe/Paris")).plusMonths(6));
        if (allergens != null && !allergens.isEmpty()) {
            newIng.setAllergens(allergens);
        }
        newIng.setDegreAlcool(abv != null ? abv : BigDecimal.ZERO);
        newIng.setIsVegan(allergens == null || (!allergens.contains(Allergen.LAIT) && !allergens.contains(Allergen.OEUF)));
        return ingredientRepository.save(newIng);
    }

    private String buildDescription(JsonNode node) {
        StringBuilder sb = new StringBuilder();
        if (node.has(KEY_MATERIEL)) {
            JsonNode mat = node.get(KEY_MATERIEL);
            if (mat.has(KEY_VERRE)) {
                sb.append("Verre : ").append(mat.get(KEY_VERRE).asText());
            }
            if (mat.has("ustensiles")) {
                if (!sb.isEmpty())
                    sb.append(" | ");
                sb.append("Matériel : ").append(mat.get("ustensiles").asText());
            }
            if (mat.has(KEY_SPECIFICATION) && !mat.get(KEY_SPECIFICATION).asText().equalsIgnoreCase("Rien")) {
                if (!sb.isEmpty())
                    sb.append(" | ");
                sb.append("Note : ").append(mat.get(KEY_SPECIFICATION).asText());
            }
        }
        return !sb.isEmpty() ? sb.toString() : "Cocktail fait maison";
    }

    private String buildInstructions(JsonNode node) {
        if (!node.has("recette_resume_etapes")) {
            return "Préparer au shaker et servir bien frais.";
        }
        JsonNode etapes = node.get("recette_resume_etapes");
        if (!etapes.isArray()) {
            return "Préparer au shaker et servir bien frais.";
        }

        List<String> list = new ArrayList<>();
        for (JsonNode step : etapes) {
            list.add(step.asText());
        }
        return String.join("\n", list);
    }

    private boolean detectAlcohol(JsonNode ingredientsNode, String cocktailName) {
        String lowerName = cocktailName.toLowerCase();
        if (lowerName.contains("virgin") || lowerName.contains("sans alcool")) {
            return false;
        }

        if (ingredientsNode == null || !ingredientsNode.isArray()) {
            return false;
        }

        for (JsonNode ing : ingredientsNode) {
            if (isIngredientAlcoholic(ing)) {
                return true;
            }
        }
        return false;
    }

    private boolean isIngredientAlcoholic(JsonNode ing) {
        if (!ing.has("nom")) {
            return false;
        }
        String ingName = ing.get("nom").asText().toLowerCase();
        for (String kw : ALCOHOL_KEYWORDS) {
            if (ingName.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    private BigDecimal resolveAlcoholLevel(String nom, boolean containsAlcohol, CocktailCategorie cat) {
        if (!containsAlcohol || cat == CocktailCategorie.SANS_ALCOOL) {
            return BigDecimal.ZERO;
        }
        String lower = nom.toLowerCase();
        if (lower.contains(KEY_BIERE) || lower.contains(KEY_BIERE_ASCII) || lower.contains("cidre")) {
            return BigDecimal.valueOf(5.0);
        }
        if (lower.contains("spritz") || lower.contains(KEY_APEROL) || lower.contains("mimosa") || lower.contains("bellini")) {
            return BigDecimal.valueOf(8.5);
        }
        if (cat == CocktailCategorie.SHOT) {
            return BigDecimal.valueOf(35.0);
        }
        if (cat == CocktailCategorie.DIGESTIF) {
            return BigDecimal.valueOf(30.0);
        }
        if (cat == CocktailCategorie.APERITIF) {
            return BigDecimal.valueOf(12.0);
        }
        return BigDecimal.valueOf(14.5);
    }

    private boolean resolveMocktail(JsonNode node, boolean containsAlcohol, CocktailCategorie cat) {
        if (node.hasNonNull("mocktail")) {
            return node.get("mocktail").asBoolean();
        }
        return !containsAlcohol || cat == CocktailCategorie.SANS_ALCOOL;
    }

    private BigDecimal resolveAlcoholLevel(JsonNode node, String nom, boolean containsAlcohol, CocktailCategorie cat) {
        if (node.hasNonNull("alcohol_level")) {
            return BigDecimal.valueOf(node.get("alcohol_level").asDouble());
        }
        if (node.hasNonNull("alcoholLevel")) {
            return BigDecimal.valueOf(node.get("alcoholLevel").asDouble());
        }
        return resolveAlcoholLevel(nom, containsAlcohol, cat);
    }

    private boolean resolveVegan(JsonNode node, JsonNode ingredientsNode) {
        if (node.hasNonNull("vegan")) {
            return node.get("vegan").asBoolean();
        }
        return detectVegan(ingredientsNode);
    }

    private boolean resolveGlutenFree(JsonNode node, JsonNode ingredientsNode) {
        if (node.hasNonNull("gluten_free")) {
            return node.get("gluten_free").asBoolean();
        }
        if (node.hasNonNull("glutenFree")) {
            return node.get("glutenFree").asBoolean();
        }
        return detectGlutenFree(ingredientsNode);
    }

    private Set<FlavorProfile> resolveFlavorProfiles(JsonNode node, JsonNode ingredientsNode, String nom) {
        if (node.hasNonNull(KEY_FLAVOR_PROFILES) && node.get(KEY_FLAVOR_PROFILES).isArray()) {
            Set<FlavorProfile> profiles = new HashSet<>();
            for (JsonNode fpNode : node.get(KEY_FLAVOR_PROFILES)) {
                try {
                    profiles.add(FlavorProfile.valueOf(fpNode.asText().trim().toUpperCase()));
                } catch (IllegalArgumentException _) {
                    // Ignored invalid enum
                }
            }
            if (!profiles.isEmpty()) {
                return profiles;
            }
        }
        return detectFlavorProfiles(ingredientsNode, nom);
    }

    private boolean containsAnyAllergen(JsonNode ingredientsNode, Set<String> targetAllergens) {
        if (ingredientsNode == null || !ingredientsNode.isArray()) {
            return false;
        }
        for (JsonNode ing : ingredientsNode) {
            JsonNode allergensNode = ing.get(KEY_ALLERGENS);
            if (allergensNode != null && allergensNode.isArray()) {
                for (JsonNode a : allergensNode) {
                    if (targetAllergens.contains(a.asText().toUpperCase(java.util.Locale.ROOT))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean detectVegan(JsonNode ingredientsNode) {
        return !containsAnyAllergen(ingredientsNode, Set.of("LAIT", "OEUF"));
    }

    private boolean detectGlutenFree(JsonNode ingredientsNode) {
        return !containsAnyAllergen(ingredientsNode, Set.of("GLUTEN"));
    }

    /**
     * Backfills flavor profiles for any existing cocktails in the database that currently have empty flavor profiles,
     * matching by name against the test dataset JSON first.
     */
    public void ensureFlavorProfilesPopulated() {
        try {
            List<Cocktail> existing = cocktailRepository.findAll();
            if (existing.isEmpty()) {
                return;
            }
            Map<String, Set<FlavorProfile>> jsonProfiles = loadFlavorProfilesFromJson();
            int backfilledCount = 0;
            for (Cocktail c : existing) {
                if (c.getFlavorProfiles() == null || c.getFlavorProfiles().isEmpty()) {
                    String normName = c.getNom() != null ? c.getNom().trim().toLowerCase() : "";
                    Set<FlavorProfile> profiles = jsonProfiles.get(normName);
                    if (profiles == null || profiles.isEmpty()) {
                        profiles = detectFlavorProfilesForCocktail(c);
                    }
                    c.setFlavorProfiles(profiles);
                    cocktailRepository.save(c);
                    backfilledCount++;
                }
            }
            if (backfilledCount > 0) {
                log.info("Successfully backfilled {} cocktails with flavor profiles from dataset.", backfilledCount);
            }
        } catch (Exception e) {
            log.warn("Failed to backfill flavor profiles: {}", e.getMessage());
        }
    }

    private Map<String, Set<FlavorProfile>> loadFlavorProfilesFromJson() {
        Map<String, Set<FlavorProfile>> map = new HashMap<>();
        try (InputStream is = loadResourceStream()) {
            if (is == null) {
                return map;
            }
            JsonNode root = objectMapper.readTree(is);
            JsonNode cocktailsNode = root.isArray() ? root : root.get(KEY_COCKTAILS);
            populateProfilesMap(cocktailsNode, map);
        } catch (Exception e) {
            log.warn("Could not load flavor profiles from dataset JSON: {}", e.getMessage());
        }
        return map;
    }

    private void populateProfilesMap(JsonNode cocktailsNode, Map<String, Set<FlavorProfile>> map) {
        if (cocktailsNode == null || !cocktailsNode.isArray()) {
            return;
        }
        for (JsonNode cNode : cocktailsNode) {
            if (cNode.hasNonNull("nom") && cNode.hasNonNull(KEY_FLAVOR_PROFILES) && cNode.get(KEY_FLAVOR_PROFILES).isArray()) {
                String name = cNode.get("nom").asText().trim().toLowerCase();
                Set<FlavorProfile> profiles = extractFlavorProfilesFromNode(cNode.get(KEY_FLAVOR_PROFILES));
                if (!profiles.isEmpty()) {
                    map.put(name, profiles);
                }
            }
        }
    }

    private Set<FlavorProfile> extractFlavorProfilesFromNode(JsonNode arrayNode) {
        Set<FlavorProfile> profiles = new HashSet<>();
        for (JsonNode fpNode : arrayNode) {
            FlavorProfile profile = parseFlavorProfile(fpNode.asText());
            if (profile != null) {
                profiles.add(profile);
            }
        }
        return profiles;
    }

    private FlavorProfile parseFlavorProfile(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return FlavorProfile.valueOf(text.trim().toUpperCase());
        } catch (IllegalArgumentException _) {
            return null;
        }
    }

    /**
     * Detects flavor profiles from a Cocktail entity's name, description, and associated ingredients.
     *
     * @param cocktail Cocktail entity to inspect
     * @return Set of detected FlavorProfile enums
     */
    public Set<FlavorProfile> detectFlavorProfilesForCocktail(Cocktail cocktail) {
        if (cocktail == null) {
            return Set.of(FlavorProfile.FRUITY);
        }
        StringBuilder sb = new StringBuilder();
        if (cocktail.getNom() != null) {
            sb.append(cocktail.getNom()).append(" ");
        }
        if (cocktail.getDescription() != null) {
            sb.append(cocktail.getDescription()).append(" ");
        }
        if (cocktail.getIngredients() != null) {
            for (CocktailIngredient ci : cocktail.getIngredients()) {
                if (ci.getIngredient() != null && ci.getIngredient().getNom() != null) {
                    sb.append(ci.getIngredient().getNom()).append(" ");
                }
            }
        }
        return detectFlavorProfilesFromText(sb.toString().toLowerCase());
    }

    private Set<FlavorProfile> detectFlavorProfiles(JsonNode ingredientsNode, String cocktailName) {
        String text = collectAllText(ingredientsNode, cocktailName).toLowerCase();
        return detectFlavorProfilesFromText(text);
    }

    public static Set<FlavorProfile> detectFlavorProfilesFromText(String text) {
        Set<FlavorProfile> profiles = new HashSet<>();
        if (text == null) {
            profiles.add(FlavorProfile.FRUITY);
            return profiles;
        }

        if (containsAnyText(text, "jus", "fruit", "citron", "lime", "orange", "fraise", "framboise", "ananas", "passion", "raisin", "pomme", "cranberry", "mangue", "pêche", "peche", "abricot", "mûre", "cerise", "grenadine", "curaçao")) {
            profiles.add(FlavorProfile.FRUITY);
        }
        if (containsAnyText(text, "citron", "lime", "sour", "acid", "pamplemousse", "cranberry", "vinaigre")) {
            profiles.add(FlavorProfile.SOUR);
        }
        if (containsAnyText(text, "sirop", "sucre", "sugar", "sweet", "miel", "honey", "liqueur", "grenadine", "vanille", "caramel", "chocolat", KEY_BAILEYS, "cacao")) {
            profiles.add(FlavorProfile.SWEET);
        }
        if (containsAnyText(text, "angostura", "bitter", KEY_CAMPARI, KEY_APEROL, "suze", "tonic", "amaro", "vermouth", "gentiane")) {
            profiles.add(FlavorProfile.BITTER);
        }
        if (containsAnyText(text, "canelle", "cannelle", "gingembre", "ginger", "piment", "chili", "tabasco", "poivre", "epice", "épicé", "muscade", "clou")) {
            profiles.add(FlavorProfile.SPICY);
        }
        if (containsAnyText(text, "fumé", "fume", "smoke", "smoky", "mezcal", "scotch", "tourbe", "islay", "bois")) {
            profiles.add(FlavorProfile.SMOKY);
        }
        if (containsAnyText(text, "menthe", "mint", "basilic", "romarin", "thym", "herbe", "herbal", "concombre", "chartreuse", "genièvre", "gin", "estragon", "sauges")) {
            profiles.add(FlavorProfile.HERBAL);
        }

        if (profiles.isEmpty()) {
            profiles.add(FlavorProfile.FRUITY);
        }
        return profiles;
    }

    private String collectAllText(JsonNode ingredientsNode, String cocktailName) {
        StringBuilder sb = new StringBuilder(cocktailName != null ? cocktailName : "");
        if (ingredientsNode != null && ingredientsNode.isArray()) {
            for (JsonNode ing : ingredientsNode) {
                if (ing.has("nom")) {
                    sb.append(" ").append(ing.get("nom").asText());
                }
            }
        }
        return sb.toString();
    }

    private static boolean containsAnyText(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ensures all existing ingredients in the database have their allergens populated from the test dataset
     * during development/test mode if they are currently empty.
     */
    public void ensureIngredientAllergensPopulated() {
        try {
            List<Ingredient> ingredients = ingredientRepository.findAll();
            if (ingredients.isEmpty()) {
                return;
            }
            Map<String, Set<Allergen>> datasetAllergens = loadDatasetAllergensMap();
            if (datasetAllergens.isEmpty()) {
                return;
            }
            int count = 0;
            for (Ingredient ing : ingredients) {
                if ((ing.getAllergens() == null || ing.getAllergens().isEmpty()) && ing.getNom() != null) {
                    Set<Allergen> fromDataset = datasetAllergens.get(ing.getNom().trim().toLowerCase(java.util.Locale.ROOT));
                    if (fromDataset != null && !fromDataset.isEmpty()) {
                        ing.setAllergens(new HashSet<>(fromDataset));
                        ingredientRepository.save(ing);
                        count++;
                    }
                }
            }
            if (count > 0) {
                log.info("Successfully populated allergens for {} test ingredients from dataset.", count);
            }
        } catch (Exception e) {
            log.warn("Failed to populate ingredient allergens: {}", e.getMessage());
        }
    }

    private Map<String, Set<Allergen>> loadDatasetAllergensMap() {
        Map<String, Set<Allergen>> map = new HashMap<>();
        InputStream is = loadResourceStream();
        if (is == null) {
            return map;
        }
        try (InputStream stream = is) {
            JsonNode root = objectMapper.readTree(stream);
            populateAllergensFromRoot(root, map);
        } catch (Exception e) {
            log.warn("Failed to read test dataset allergens map: {}", e.getMessage());
        }
        return map;
    }

    private void populateAllergensFromRoot(JsonNode root, Map<String, Set<Allergen>> map) {
        JsonNode cocktailsNode = root.get(KEY_COCKTAILS);
        if (cocktailsNode == null || !cocktailsNode.isArray()) {
            return;
        }
        for (JsonNode cNode : cocktailsNode) {
            populateAllergensFromCocktail(cNode, map);
        }
    }

    private void populateAllergensFromCocktail(JsonNode cNode, Map<String, Set<Allergen>> map) {
        JsonNode ingArray = cNode.get(KEY_INGREDIENTS);
        if (ingArray == null || !ingArray.isArray()) {
            return;
        }
        for (JsonNode ingNode : ingArray) {
            if (ingNode.has("nom")) {
                String name = ingNode.get("nom").asText().trim().toLowerCase(java.util.Locale.ROOT);
                Set<Allergen> extracted = extractAllergens(ingNode);
                if (!extracted.isEmpty()) {
                    map.computeIfAbsent(name, _ -> new HashSet<>()).addAll(extracted);
                }
            }
        }
    }
}

