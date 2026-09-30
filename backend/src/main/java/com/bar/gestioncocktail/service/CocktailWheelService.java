package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO;
import com.bar.gestioncocktail.dto.CocktailWheelDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.CocktailWheelScope;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Service managing dynamic chord connection wheel generation for flavor and ingredient pairings.
 * <p>
 * Generates interactive chord graph datasets (taxonomy categories, ingredient frequency nodes,
 * and flavor co-occurrence ribbon edges) across both the master cocktail library and the
 * establishment's live cocktail catalog. Supports persistent file caching for offline resilience.
 */
@Service
@Transactional(readOnly = true)
public class CocktailWheelService {

    private static final Logger log = LoggerFactory.getLogger(CocktailWheelService.class);
    private static final String DEFAULT_CATEGORY = "other";
    private static final String CATEGORY_LIQUEURS = "Liqueurs";
    private static final String FIELD_NODES = "nodes";
    private static final String ESTABLISHMENT_WHEEL_FILE = "data/establishment_connection_wheel.json";
    private static final String LIBRARY_WHEEL_RESOURCE = "data/cocktail_connection_wheel.json";

    public static final Map<String, CocktailWheelDTO.CategoryDTO> WHEEL_CATEGORIES;

    static {
        Map<String, CocktailWheelDTO.CategoryDTO> map = new LinkedHashMap<>();
        map.put("dark_liquor", new CocktailWheelDTO.CategoryDTO("Dark liquor", "Spiritueux bruns", "Dark liquor", "Bruns", "#7e3b34"));
        map.put("light_liquor", new CocktailWheelDTO.CategoryDTO("Light liquor", "Spiritueux blancs", "Light liquor", "Blancs", "#b5705c"));
        map.put("liqueurs", new CocktailWheelDTO.CategoryDTO(CATEGORY_LIQUEURS, CATEGORY_LIQUEURS, CATEGORY_LIQUEURS, CATEGORY_LIQUEURS, "#a4577a"));
        map.put("wine_beer", new CocktailWheelDTO.CategoryDTO("Wine & beer", "Vins & bières", "Wine", "Vins", "#6f4763"));
        map.put("nonalcoholic", new CocktailWheelDTO.CategoryDTO("Juices & sodas", "Jus & sodas", "Juices", "Jus", "#438aa5"));
        map.put("mixers", new CocktailWheelDTO.CategoryDTO("Mixers & sweeteners", "Mélanges & sirops", "Mixers", "Sirops", "#8585b3"));
        map.put("fruits", new CocktailWheelDTO.CategoryDTO("Fruit & citrus", "Fruits & agrumes", "Fruit", "Fruits", "#bd9d3e"));
        map.put("spices", new CocktailWheelDTO.CategoryDTO("Herbs & spices", "Herbes & épices", "Herbs", "Herbes", "#598570"));
        map.put("bitters", new CocktailWheelDTO.CategoryDTO("Bitters & aromatics", "Bitters & amers", "Bitters", "Bitters", "#6d5a2f"));
        map.put(DEFAULT_CATEGORY, new CocktailWheelDTO.CategoryDTO("Other ingredients", "Autres ingrédients", "Other", "Autres", "#8c817b"));
        WHEEL_CATEGORIES = Collections.unmodifiableMap(map);
    }

    private final CocktailRepository cocktailRepository;
    private final ObjectMapper objectMapper;
    private final EstablishmentConfigService establishmentConfigService;

    private final AtomicReference<JsonNode> libraryWheelCache = new AtomicReference<>();
    private final AtomicReference<JsonNode> establishmentWheelCache = new AtomicReference<>();

    private static Integer addCounts(Integer a, Integer b) {
        return (a == null ? 0 : a) + (b == null ? 0 : b);
    }

    /**
     * Constructs the cocktail wheel service with required repositories and serializers.
     *
     * @param cocktailRepository         Repository for cocktail entities
     * @param objectMapper               Jackson object mapper
     * @param establishmentConfigService Service for module capabilities validation
     */
    public CocktailWheelService(
            CocktailRepository cocktailRepository,
            ObjectMapper objectMapper,
            EstablishmentConfigService establishmentConfigService) {
        this.cocktailRepository = cocktailRepository;
        this.objectMapper = objectMapper;
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Retrieves the chord connection wheel dataset for the specified scope.
     *
     * @param scope Scope of the connection wheel (LIBRARY or ESTABLISHMENT)
     * @return JsonNode containing connection wheel graph data
     */
    public JsonNode getWheelData(CocktailWheelScope scope) {
        if (scope == CocktailWheelScope.LIBRARY) {
            establishmentConfigService.checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);
            return getLibraryWheelData();
        }
        return getEstablishmentWheelData();
    }

    /**
     * Retrieves the connection wheel dataset for the master cocktail library.
     * Uses in-memory cache with fallback to embedded classpath asset.
     *
     * @return JsonNode containing library chord graph
     */
    public synchronized JsonNode getLibraryWheelData() {
        JsonNode cached = libraryWheelCache.get();
        if (cached != null) {
            return cached;
        }

        try {
            ClassPathResource resource = new ClassPathResource(LIBRARY_WHEEL_RESOURCE);
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    JsonNode node = objectMapper.readTree(is);
                    libraryWheelCache.set(node);
                    return node;
                }
            }
        } catch (Exception e) {
            log.error("Failed to load connection wheel dataset from resource '{}'", LIBRARY_WHEEL_RESOURCE, e);
        }

        CocktailWheelDTO.ConnectionWheelDTO emptyWheel = new CocktailWheelDTO.ConnectionWheelDTO(
                WHEEL_CATEGORIES,
                Collections.emptyList(),
                Collections.emptyList()
        );
        JsonNode emptyNode = objectMapper.valueToTree(emptyWheel);
        libraryWheelCache.set(emptyNode);
        return emptyNode;
    }

    /**
     * Dynamically generates and caches the connection wheel graph from cocktail library templates.
     *
     * @param items List of cocktail library item templates
     * @return Generated JsonNode dataset
     */
    public synchronized JsonNode generateLibraryWheel(List<CocktailLibraryItemDTO> items) {
        if (items == null || items.isEmpty()) {
            return getLibraryWheelData();
        }

        Map<String, Integer> ingredientCount = new HashMap<>();
        Map<String, String> ingredientLabels = new HashMap<>();
        Map<String, String> ingredientGroups = new HashMap<>();
        Map<String, Integer> pairCooccurrences = new HashMap<>();

        for (CocktailLibraryItemDTO item : items) {
            if (item.ingredients() == null || item.ingredients().isEmpty()) {
                continue;
            }

            Map<String, String> itemIngredients = new LinkedHashMap<>();
            for (CocktailLibraryItemDTO.CocktailLibraryIngredientDTO ing : item.ingredients()) {
                if (ing.nom() == null || ing.nom().isBlank()) {
                    continue;
                }
                String normId = normalizeId(ing.nom());
                String label = ing.nom().trim();
                String group = normalizeGroup(ing.category());

                itemIngredients.putIfAbsent(normId, group);
                ingredientLabels.putIfAbsent(normId, label);
                ingredientGroups.putIfAbsent(normId, group);
            }

            List<String> distinctIds = new ArrayList<>(itemIngredients.keySet());
            for (String ingId : distinctIds) {
                ingredientCount.merge(ingId, 1, CocktailWheelService::addCounts);
            }

            registerPairs(distinctIds, pairCooccurrences);
        }

        CocktailWheelDTO.ConnectionWheelDTO wheelDto = buildWheelDTO(
                ingredientCount,
                ingredientLabels,
                ingredientGroups,
                pairCooccurrences
        );

        JsonNode generated = objectMapper.valueToTree(wheelDto);
        libraryWheelCache.set(generated);
        log.info("Dynamically generated library connection wheel: {} nodes, {} edges across {} recipes.",
                wheelDto.nodes().size(), wheelDto.edges().size(), items.size());
        return generated;
    }

    /**
     * Clears in-memory caches for testing or forced reloading.
     */
    public synchronized void clearCaches() {
        this.libraryWheelCache.set(null);
        this.establishmentWheelCache.set(null);
    }

    /**
     * Retrieves the connection wheel dataset for the establishment catalog.
     * Loads from in-memory cache, persistent cache file, or regenerates from repository.
     *
     * @return JsonNode containing establishment chord graph
     */
    public synchronized JsonNode getEstablishmentWheelData() {
        JsonNode cached = establishmentWheelCache.get();
        if (cached != null) {
            return cached;
        }

        JsonNode fromFile = loadWheelFromFile(ESTABLISHMENT_WHEEL_FILE);
        if (fromFile != null && fromFile.has(FIELD_NODES) && fromFile.get(FIELD_NODES).isArray() && !fromFile.get(FIELD_NODES).isEmpty()) {
            establishmentWheelCache.set(fromFile);
            return fromFile;
        }

        return regenerateEstablishmentWheel();
    }

    /**
     * Dynamically regenerates, updates in-memory cache, and persists the establishment connection wheel dataset.
     *
     * @return Regenerated JsonNode dataset
     */
    public synchronized JsonNode regenerateEstablishmentWheel() {
        List<Cocktail> cocktails;
        try {
            cocktails = cocktailRepository.findAllWithIngredients();
        } catch (Exception e) {
            log.warn("findAllWithIngredients query failed, falling back to findAll()", e);
            cocktails = cocktailRepository.findAll();
        }

        Map<String, Integer> ingredientCount = new HashMap<>();
        Map<String, String> ingredientLabels = new HashMap<>();
        Map<String, String> ingredientGroups = new HashMap<>();
        Map<String, Integer> pairCooccurrences = new HashMap<>();

        for (Cocktail cocktail : cocktails) {
            if (cocktail.getIngredients() == null || cocktail.getIngredients().isEmpty()) {
                continue;
            }

            Map<String, String> cocktailIngredients = new LinkedHashMap<>();
            for (CocktailIngredient ci : cocktail.getIngredients()) {
                Ingredient ing = ci.getIngredient();
                if (ing == null || ing.getNom() == null || ing.getNom().isBlank()) {
                    continue;
                }
                String normId = normalizeId(ing.getNom());
                String label = ing.getNom().trim();
                String group = normalizeGroup(ing.getCategory());

                cocktailIngredients.putIfAbsent(normId, group);
                ingredientLabels.putIfAbsent(normId, label);
                ingredientGroups.putIfAbsent(normId, group);
            }

            List<String> distinctIds = new ArrayList<>(cocktailIngredients.keySet());
            for (String ingId : distinctIds) {
                ingredientCount.merge(ingId, 1, CocktailWheelService::addCounts);
            }

            registerPairs(distinctIds, pairCooccurrences);
        }

        CocktailWheelDTO.ConnectionWheelDTO wheelDto = buildWheelDTO(
                ingredientCount,
                ingredientLabels,
                ingredientGroups,
                pairCooccurrences
        );

        JsonNode generated = objectMapper.valueToTree(wheelDto);
        establishmentWheelCache.set(generated);
        saveWheelToFile(generated, ESTABLISHMENT_WHEEL_FILE);
        log.info("Regenerated establishment cocktail connection wheel: {} nodes, {} edges across {} cocktails.",
                wheelDto.nodes().size(), wheelDto.edges().size(), cocktails.size());
        return generated;
    }

    private void registerPairs(List<String> distinctIds, Map<String, Integer> pairCooccurrences) {
        int size = distinctIds.size();
        for (int i = 0; i < size; i++) {
            String a = distinctIds.get(i);
            for (int j = i + 1; j < size; j++) {
                String b = distinctIds.get(j);
                String pairKey = a.compareTo(b) < 0 ? a + "###" + b : b + "###" + a;
                pairCooccurrences.merge(pairKey, 1, CocktailWheelService::addCounts);
            }
        }
    }

    private CocktailWheelDTO.ConnectionWheelDTO buildWheelDTO(
            Map<String, Integer> ingredientCount,
            Map<String, String> ingredientLabels,
            Map<String, String> ingredientGroups,
            Map<String, Integer> pairCooccurrences) {

        List<String> sortedIds = new ArrayList<>(ingredientCount.keySet());
        sortedIds.sort((a, b) -> {
            String groupA = ingredientGroups.getOrDefault(a, DEFAULT_CATEGORY);
            String groupB = ingredientGroups.getOrDefault(b, DEFAULT_CATEGORY);
            int groupCmp = groupA.compareTo(groupB);
            if (groupCmp != 0) {
                return groupCmp;
            }
            int countCmp = Integer.compare(ingredientCount.getOrDefault(b, 0), ingredientCount.getOrDefault(a, 0));
            if (countCmp != 0) {
                return countCmp;
            }
            return a.compareTo(b);
        });

        List<CocktailWheelDTO.NodeDTO> nodes = new ArrayList<>();
        int sourceIndex = 0;
        for (String id : sortedIds) {
            String label = ingredientLabels.getOrDefault(id, id);
            String group = ingredientGroups.getOrDefault(id, DEFAULT_CATEGORY);
            int count = ingredientCount.getOrDefault(id, 0);

            nodes.add(new CocktailWheelDTO.NodeDTO(
                    id,
                    label,
                    group,
                    group,
                    sourceIndex++,
                    count
            ));
        }

        List<CocktailWheelDTO.EdgeDTO> edges = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : pairCooccurrences.entrySet()) {
            String[] parts = entry.getKey().split("###");
            if (parts.length == 2) {
                edges.add(new CocktailWheelDTO.EdgeDTO(parts[0], parts[1], entry.getValue()));
            }
        }

        edges.sort((e1, e2) -> {
            int cmp = Integer.compare(e2.count(), e1.count());
            if (cmp != 0) {
                return cmp;
            }
            int cmpA = e1.a().compareTo(e2.a());
            if (cmpA != 0) {
                return cmpA;
            }
            return e1.b().compareTo(e2.b());
        });

        return new CocktailWheelDTO.ConnectionWheelDTO(
                WHEEL_CATEGORIES,
                nodes,
                edges
        );
    }

    private String normalizeId(String name) {
        if (name == null) {
            return "";
        }
        return name.trim().toLowerCase();
    }

    private String normalizeGroup(String rawGroup) {
        if (rawGroup == null || rawGroup.isBlank()) {
            return DEFAULT_CATEGORY;
        }
        String normalized = rawGroup.trim().toLowerCase();
        return WHEEL_CATEGORIES.containsKey(normalized) ? normalized : DEFAULT_CATEGORY;
    }

    private synchronized void saveWheelToFile(JsonNode node, String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (path.getParent() != null && !Files.exists(path.getParent())) {
                Files.createDirectories(path.getParent());
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), node);
        } catch (IOException e) {
            log.warn("Could not persist establishment connection wheel to file '{}': {}", filePath, e.getMessage());
        }
    }

    private synchronized JsonNode loadWheelFromFile(String filePath) {
        try {
            File file = new File(filePath);
            if (file.exists() && file.isFile() && file.length() > 0) {
                return objectMapper.readTree(file);
            }
        } catch (IOException e) {
            log.warn("Could not read persistent connection wheel from file '{}': {}", filePath, e.getMessage());
        }
        return null;
    }
}
