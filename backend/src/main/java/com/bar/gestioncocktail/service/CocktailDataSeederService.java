package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Service responsible for automatically seeding the database with the cocktail
 * dataset ONLY in the dev/test environment if the database contains no cocktails on startup.
 */
@Service
@Profile({"dev", "test"})
public class CocktailDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(CocktailDataSeederService.class);
    private static final String DATASET_PATH = "data/cocktails_list.json";

    private static final String KEY_ECONOMIE = "economie";
    private static final String KEY_MEDIA = "media";
    private static final String KEY_MATERIEL = "materiel";
    private static final String KEY_SPECIFICATION = "specification";

    private static final Set<String> ALCOHOL_KEYWORDS = Set.of(
            "rhum", "vodka", "gin", "tequila", "whisky", "whiskey", "calvados", "cognac", "armagnac",
            "liqueur", "cointreau", "triple sec", "martini", "campari", "aperol", "bière", "vin",
            "prosecco", "champagne", "kahlua", "baileys", "get", "manzana", "pastis", "ricard",
            "angostura", "bourbon", "absinthe", "amaretto", "malibu", "chartreuse", "suze");

    private final CocktailRepository cocktailRepository;
    private final IngredientRepository ingredientRepository;
    private final CocktailIngredientRepository cocktailIngredientRepository;
    private final CocktailVarianteRepository cocktailVarianteRepository;
    private final ObjectMapper objectMapper;

    public CocktailDataSeederService(
            CocktailRepository cocktailRepository,
            IngredientRepository ingredientRepository,
            CocktailIngredientRepository cocktailIngredientRepository,
            CocktailVarianteRepository cocktailVarianteRepository) {
        this.cocktailRepository = cocktailRepository;
        this.ingredientRepository = ingredientRepository;
        this.cocktailIngredientRepository = cocktailIngredientRepository;
        this.cocktailVarianteRepository = cocktailVarianteRepository;
        this.objectMapper = JsonMapper.builder()
                .enable(JsonReadFeature.ALLOW_NON_NUMERIC_NUMBERS)
                .build();
    }

    /**
     * Executes automatic dataset seeding if no cocktails are present in the
     * repository.
     */
    @PostConstruct
    @Transactional
    public void seedCocktailsIfEmpty() {
        if (cocktailRepository.count() > 0) {
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
            JsonNode cocktailsNode = root.get("cocktails");
            if (cocktailsNode == null || !cocktailsNode.isArray()) {
                log.warn("Invalid cocktail JSON dataset format.");
                return;
            }

            int importedCount = 0;
            for (JsonNode node : cocktailsNode) {
                if (importSingleCocktail(node)) {
                    importedCount++;
                }
            }
            log.info("Successfully seeded database with {} cocktails from test dataset.", importedCount);
        } catch (Exception e) {
            log.error("Failed to seed cocktail test dataset", e);
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

    private boolean importSingleCocktail(JsonNode node) {
        try {
            String nom = node.has("nom") ? node.get("nom").asText().trim() : null;
            if (nom == null || nom.isBlank() || cocktailRepository.findByNomIgnoreCase(nom).isPresent()) {
                return false;
            }

            Cocktail cocktail = new Cocktail();
            cocktail.setNom(nom);
            cocktail.setPrix(extractPrice(node));
            cocktail.setDescription(buildDescription(node));
            cocktail.setInstructions(buildInstructions(node));
            cocktail.setVatRate(VatRate.TWENTY);
            cocktail.setDisponible(true);

            if (node.has(KEY_MEDIA) && node.get(KEY_MEDIA).has("photo_url")) {
                String photoUrl = node.get(KEY_MEDIA).get("photo_url").asText();
                if (photoUrl != null && !photoUrl.isBlank()) {
                    cocktail.setImageUrl(photoUrl);
                }
            }

            JsonNode ingredientsNode = node.get("ingredients");
            boolean containsAlcohol = detectAlcohol(ingredientsNode, nom);
            cocktail.setCategorie(detectCategory(node, containsAlcohol));

            Cocktail savedCocktail = cocktailRepository.save(cocktail);
            List<CocktailIngredient> ingredientsList = importIngredients(savedCocktail, ingredientsNode);

            savedCocktail.setIngredients(ingredientsList);
            cocktailRepository.save(savedCocktail);

            importVariantes(savedCocktail, node.get("variantes"));
            return true;
        } catch (Exception e) {
            log.error("Error importing cocktail node: {}", node, e);
            return false;
        }
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
        v.setDescription(vNode.hasNonNull("description") ? vNode.get("description").asText() : null);
        v.setPrixSupplement(extractBigDecimal(vNode, "prix_supplement", BigDecimal.ZERO));
        v.setMultiplicateurIngredient(extractBigDecimal(vNode, "multiplicateur_ingredient", BigDecimal.ONE));
        v.setDisponible(!vNode.hasNonNull("disponible") || vNode.get("disponible").asBoolean());
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

        String unite = ingNode.has("unite") ? ingNode.get("unite").asText().trim() : "cl";
        double qtyRaw = ingNode.has("quantite") ? ingNode.get("quantite").asDouble(1.0) : 1.0;
        if (Double.isNaN(qtyRaw) || Double.isInfinite(qtyRaw)) {
            qtyRaw = 1.0;
        }

        double costRaw = ingNode.has("cout_eur") ? ingNode.get("cout_eur").asDouble(0.0) : 0.0;
        if (Double.isNaN(costRaw) || Double.isInfinite(costRaw)) {
            costRaw = 0.0;
        }

        Ingredient ingredient = findOrCreateIngredient(ingNom, unite, costRaw);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setCocktail(savedCocktail);
        ci.setIngredient(ingredient);
        ci.setQuantite(BigDecimal.valueOf(qtyRaw).setScale(2, RoundingMode.HALF_UP));
        return cocktailIngredientRepository.save(ci);
    }

    private Ingredient findOrCreateIngredient(String ingNom, String unite, double costRaw) {
        return ingredientRepository.findByNomIgnoreCase(ingNom)
                .orElseGet(() -> {
                    Ingredient newIng = new Ingredient();
                    newIng.setNom(ingNom);
                    newIng.setUniteMesure(unite.isEmpty() || unite.equalsIgnoreCase("nan") ? "cl" : unite);
                    newIng.setQuantiteStock(BigDecimal.valueOf(100.0));
                    newIng.setSeuilAlerte(BigDecimal.valueOf(10.0));
                    newIng.setPrixUnitaire(BigDecimal.valueOf(costRaw > 0 ? costRaw : 0.50).setScale(4, RoundingMode.HALF_UP));
                    newIng.setFournisseur("Fournisseur Boissons & Primeurs");
                    newIng.setDatePeremption(LocalDateTime.now(java.time.ZoneId.of("Europe/Paris")).plusMonths(6));
                    return ingredientRepository.save(newIng);
                });
    }

    private String buildDescription(JsonNode node) {
        StringBuilder sb = new StringBuilder();
        if (node.has(KEY_MATERIEL)) {
            JsonNode mat = node.get(KEY_MATERIEL);
            if (mat.has("verre")) {
                sb.append("Verre : ").append(mat.get("verre").asText());
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
}
