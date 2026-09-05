package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Service responsible for automatically seeding a rich, complete demonstration dataset
 * (Users, Zones, Tables, Shifts, Shift Presets, Active Orders, Overdue Orders, Paid & Pending Invoices,
 * Split Settlements, Credit Notes, Stock Adjustments, and Schedule Publications)
 * from the JSON dataset file 'data/demo_dataset.json' on application startup in 'dev' and 'test' profiles.
 */
@Service
@Transactional
@DependsOn({"glasswareDataSeederService", "cocktailDataSeederService"})
@Profile({"dev", "test"})
public class SampleDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(SampleDataSeederService.class);
    private static final String DATASET_PATH = "data/demo_dataset.json";
    private static final String KEY_ROLES = "roles";
    private static final String KEY_SERVEUR_USERNAME = "serveurUsername";
    private static final String KEY_NOTES = "notes";
    private static final String KEY_ITEMS = "items";
    private static final String KEY_QUANTITE = "quantite";
    private static final String KEY_DAY_OF_WEEK = "dayOfWeek";
    private static final String KEY_DESCRIPTION = "description";
    private static final String PLAN_X = "planX";
    private static final String PLAN_Y = "planY";
    private static final String PLAN_WIDTH = "planWidth";
    private static final String PLAN_HEIGHT = "planHeight";
    private static final String KEY_NUMERO = "numero";
    private static final String KEY_TABLE_NUMERO = "tableNumero";
    private static final String KEY_MINUTES_AGO = "minutesAgo";
    private static final String KEY_DUREE_PAUSE_MINUTES = "dureePauseMinutes";
    private static final String KEY_MODE_PAIEMENT = "modePaiement";
    private static final String KEY_POURBOIRE = "pourboire";
    private static final String KEY_REGLEMENTS = "reglements";
    private static final String SCRIPT_TAG = "<script>";
    private static final String KEY_TEST = "Test";

    private final UserRepository userRepository;
    private final TableRepository tableRepository;
    private final ZoneRepository zoneRepository;
    private final EtageRepository etageRepository;
    private final CocktailRepository cocktailRepository;
    private final IngredientRepository ingredientRepository;
    private final RecipeStepTemplateRepository recipeStepTemplateRepository;
    private final CommandeRepository commandeRepository;
    private final FactureRepository factureRepository;
    private final FactureReglementRepository factureReglementRepository;
    private final AvoirCreditRepository avoirCreditRepository;
    private final ShiftPresetRepository shiftPresetRepository;
    private final EmployeeShiftRepository employeeShiftRepository;
    private final EstablishmentClosureRepository establishmentClosureRepository;
    private final WeekSchedulePublicationRepository weekSchedulePublicationRepository;
    private final TableAppelRepository tableAppelRepository;
    private final AppSettingsRepository appSettingsRepository;
    private final EstablishmentConfigRepository establishmentConfigRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final TimeService timeService;
    private final PlatformTransactionManager transactionManager;
    private final CocktailDataSeederService cocktailDataSeederService;
    private final org.springframework.core.env.Environment environment;
    private final ObjectMapper objectMapper;

    /**
     * Constructs the sample data seeder service with required repositories, services, and environment dependencies.
     */
    public SampleDataSeederService(
            UserRepository userRepository,
            TableRepository tableRepository,
            ZoneRepository zoneRepository,
            EtageRepository etageRepository,
            CocktailRepository cocktailRepository,
            IngredientRepository ingredientRepository,
            RecipeStepTemplateRepository recipeStepTemplateRepository,
            CommandeRepository commandeRepository,
            FactureRepository factureRepository,
            FactureReglementRepository factureReglementRepository,
            AvoirCreditRepository avoirCreditRepository,
            ShiftPresetRepository shiftPresetRepository,
            EmployeeShiftRepository employeeShiftRepository,
            EstablishmentClosureRepository establishmentClosureRepository,
            WeekSchedulePublicationRepository weekSchedulePublicationRepository,
            TableAppelRepository tableAppelRepository,
            AppSettingsRepository appSettingsRepository,
            EstablishmentConfigRepository establishmentConfigRepository,
            JdbcTemplate jdbcTemplate,
            PasswordEncoder passwordEncoder,
            TimeService timeService,
            PlatformTransactionManager transactionManager,
            CocktailDataSeederService cocktailDataSeederService,
            org.springframework.core.env.Environment environment) {
        this.userRepository = userRepository;
        this.tableRepository = tableRepository;
        this.zoneRepository = zoneRepository;
        this.etageRepository = etageRepository;
        this.cocktailRepository = cocktailRepository;
        this.ingredientRepository = ingredientRepository;
        this.recipeStepTemplateRepository = recipeStepTemplateRepository;
        this.commandeRepository = commandeRepository;
        this.factureRepository = factureRepository;
        this.factureReglementRepository = factureReglementRepository;
        this.avoirCreditRepository = avoirCreditRepository;
        this.shiftPresetRepository = shiftPresetRepository;
        this.employeeShiftRepository = employeeShiftRepository;
        this.establishmentClosureRepository = establishmentClosureRepository;
        this.weekSchedulePublicationRepository = weekSchedulePublicationRepository;
        this.tableAppelRepository = tableAppelRepository;
        this.appSettingsRepository = appSettingsRepository;
        this.establishmentConfigRepository = establishmentConfigRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.timeService = timeService;
        this.transactionManager = transactionManager;
        this.cocktailDataSeederService = cocktailDataSeederService;
        this.environment = environment;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Automatically executes demo dataset seeding on startup ONLY when running with the 'test' profile.
     * In 'dev' and 'prod' profiles, automatic startup seeding is skipped to maintain a clean blank database.
     */
    @PostConstruct
    public void seedDemoDataIfEmpty() {
        migrateLegacySchemas();
        cleanPollutedTestData();

        if (!isTestProfileActive()) {
            log.info("Skipping automatic demo dataset startup seeding (active profile is not 'test'). Database remains clean.");
            return;
        }

        log.info("Starting complete demo dataset seeding from JSON asset '{}'...", DATASET_PATH);
        seedAllDemoData();
        log.info("Demo dataset seeding successfully finished.");
    }

    private void migrateLegacySchemas() {
        if (jdbcTemplate != null) {
            safelyInTransaction(() -> {
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6c7fe8'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS primary_color_strong VARCHAR(7) DEFAULT '#5a68d6'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(2048)");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS establishment_name VARCHAR(100) DEFAULT 'OpenBar'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_theme VARCHAR(20) DEFAULT 'DARK'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'EUR'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '€'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS currency_position VARCHAR(10) DEFAULT 'AFTER'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS temps_alerte_warning_minutes INTEGER DEFAULT 3");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS temps_alerte_commande_minutes INTEGER DEFAULT 5");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS temps_alerte_critique_commande_minutes INTEGER DEFAULT 10");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS client_base_url VARCHAR(500) DEFAULT 'https://openbar.lan'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_ssid VARCHAR(100) DEFAULT 'OpenBar-WiFi'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(100) DEFAULT 'OpenBar2026!'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_security VARCHAR(20) DEFAULT 'WPA2'");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_enabled BOOLEAN DEFAULT false");
                jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
                jdbcTemplate.execute("ALTER TABLE establishment_config ADD COLUMN IF NOT EXISTS ticket_format VARCHAR(10) DEFAULT '80mm'");
            }, "migrateLegacySchemas");
        }
    }

    /**
     * Purges leftover mock or XSS test records mistakenly persisted during local integration test runs.
     */
    public void cleanPollutedTestData() {
        safelyInTransaction(this::cleanPollutedOrders, "cleanPollutedOrders");
        safelyInTransaction(this::cleanPollutedTables, "cleanPollutedTables");
        safelyInTransaction(this::cleanPollutedZones, "cleanPollutedZones");
        safelyInTransaction(this::cleanPollutedCocktails, "cleanPollutedCocktails");
        safelyInTransaction(this::cleanPollutedIngredients, "cleanPollutedIngredients");
    }

    private void safelyInTransaction(Runnable action, String description) {
        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(_ -> action.run());
        } catch (Exception e) {
            log.debug("Cleanup step '{}' encountered exception: {}", description, e.getMessage());
        }
    }

    private void cleanPollutedTables() {
        try {
            List<TableEntity> testTables = tableRepository.findAll().stream()
                    .filter(t -> t.getNumero() != null && (t.getNumero() == 999 || t.getNumero() == 99 || t.getNumero() == 88 || t.getNumero() >= 80 || (t.getZone() != null && (t.getZone().contains(SCRIPT_TAG) || t.getZone().contains(KEY_TEST)))))
                    .toList();
            if (!testTables.isEmpty()) {
                log.info("Cleaning up {} polluted test tables from development database...", testTables.size());
                for (TableEntity testTable : testTables) {
                    detachTableDependencies(testTable.getId());
                }
                factureRepository.flush();
                commandeRepository.flush();
                tableAppelRepository.flush();
                tableRepository.deleteAll(testTables);
                tableRepository.flush();
            }

            deduplicateTables();
        } catch (Exception e) {
            log.warn("Failed to clean polluted tables: {}", e.getMessage());
        }
    }

    private void deduplicateTables() {
        try {
            List<TableEntity> currentTables = tableRepository.findAll();
            Map<Integer, List<TableEntity>> groupedByNumero = new HashMap<>();
            for (TableEntity t : currentTables) {
                if (t.getNumero() != null) {
                    groupedByNumero.computeIfAbsent(t.getNumero(), _ -> new ArrayList<>()).add(t);
                }
            }

            List<TableEntity> duplicatesToDelete = new ArrayList<>();
            for (Map.Entry<Integer, List<TableEntity>> entry : groupedByNumero.entrySet()) {
                List<TableEntity> tablesWithSameNumero = entry.getValue();
                if (tablesWithSameNumero.size() > 1) {
                    for (int i = 1; i < tablesWithSameNumero.size(); i++) {
                        TableEntity dup = tablesWithSameNumero.get(i);
                        detachTableDependencies(dup.getId());
                        duplicatesToDelete.add(dup);
                    }
                }
            }

            if (!duplicatesToDelete.isEmpty()) {
                log.info("Cleaning up {} duplicate table records from development database...", duplicatesToDelete.size());
                factureRepository.flush();
                commandeRepository.flush();
                tableAppelRepository.flush();
                tableRepository.deleteAll(duplicatesToDelete);
                tableRepository.flush();
            }
        } catch (Exception e) {
            log.warn("Failed to deduplicate tables: {}", e.getMessage());
        }
    }

    private void detachTableDependencies(Long tableId) {
        if (tableId == null) {
            return;
        }
        safelyExecute(() -> factureRepository.detachTableFromFactures(tableId), "detach factures for table " + tableId);
        safelyExecute(() -> commandeRepository.detachTableFromCommandes(tableId), "detach commandes for table " + tableId);
        safelyExecute(() -> tableAppelRepository.deleteByTableId(tableId), "delete appels for table " + tableId);
    }

    private void safelyExecute(Runnable action, String description) {
        try {
            action.run();
        } catch (Exception ex) {
            log.debug("Could not {}: {}", description, ex.getMessage());
        }
    }

    private void cleanPollutedZones() {
        try {
            List<ZoneEntity> testZones = zoneRepository.findAll().stream()
                    .filter(z -> z.getNom() != null && (z.getNom().contains(SCRIPT_TAG) || z.getNom().contains(KEY_TEST)))
                    .toList();
            if (!testZones.isEmpty()) {
                log.info("Cleaning up {} polluted test zones from development database...", testZones.size());
                zoneRepository.deleteAll(testZones);
                zoneRepository.flush();
            }
        } catch (Exception e) {
            log.warn("Failed to clean polluted zones: {}", e.getMessage());
        }
    }

    private void cleanPollutedCocktails() {
        try {
            List<Cocktail> testCocktails = cocktailRepository.findAll().stream()
                    .filter(c -> c.getNom() != null && (c.getNom().contains(SCRIPT_TAG) || c.getNom().equals("Spicy Mezcal")))
                    .toList();
            if (!testCocktails.isEmpty()) {
                log.info("Cleaning up {} polluted test cocktails from development database...", testCocktails.size());
                cocktailRepository.deleteAll(testCocktails);
            }
        } catch (Exception e) {
            log.warn("Failed to clean polluted cocktails: {}", e.getMessage());
        }
    }

    private void cleanPollutedIngredients() {
        try {
            List<Ingredient> testIngredients = ingredientRepository.findAll().stream()
                    .filter(i -> i.getNom() != null && i.getNom().contains(SCRIPT_TAG))
                    .toList();
            if (!testIngredients.isEmpty()) {
                log.info("Cleaning up {} polluted test ingredients from development database...", testIngredients.size());
                ingredientRepository.deleteAll(testIngredients);
            }
        } catch (Exception e) {
            log.warn("Failed to clean polluted ingredients: {}", e.getMessage());
        }
    }

    private void cleanPollutedOrders() {
        try {
            List<Commande> emptyOrders = commandeRepository.findAll().stream()
                    .filter(c -> c.getItems() == null || c.getItems().isEmpty())
                    .toList();
            if (!emptyOrders.isEmpty()) {
                log.info("Cleaning up {} empty test orders without items from development database...", emptyOrders.size());
                commandeRepository.deleteAll(emptyOrders);
                commandeRepository.flush();
            }
        } catch (Exception e) {
            log.warn("Failed to clean empty test orders: {}", e.getMessage());
        }
    }

    public void seedAllDemoData() {
        migrateLegacySchemas();

        if (cocktailDataSeederService != null && cocktailRepository.count() == 0) {
            log.info("Seeding cocktails prerequisite for demo dataset...");
            cocktailDataSeederService.seedCocktails(false);
        }

        InputStream is = loadResourceStream();
        if (is == null) {
            log.warn("Demo dataset JSON file '{}' not found in classpath.", DATASET_PATH);
            return;
        }

        try (InputStream stream = is) {
            JsonNode root = objectMapper.readTree(stream);

            final Map<String, User> usersMap = new HashMap<>();
            safelyInTransaction(() -> usersMap.putAll(seedUsersFromJson(root.get("users"))), "seedUsers");
            safelyInTransaction(() -> seedEtagesFromJson(root.get("etages")), "seedEtages");
            safelyInTransaction(() -> seedZonesFromJson(root.get("zones")), "seedZones");

            final Map<Integer, TableEntity> tablesMap = new HashMap<>();
            safelyInTransaction(() -> tablesMap.putAll(seedTablesFromJson(root.get("tables"), usersMap)), "seedTables");

            safelyInTransaction(() -> seedShiftPresetsFromJson(root.get("shift_presets")), "seedShiftPresets");
            safelyInTransaction(() -> seedShiftsFromJson(root.get("shifts"), usersMap), "seedShifts");
            safelyInTransaction(() -> seedClosuresFromJson(root.get("closures")), "seedClosures");
            safelyInTransaction(() -> seedWeekPublicationsFromJson(root.get("week_publications")), "seedWeekPublications");

            final Map<String, RecipeStepTemplate> templatesMap = new HashMap<>();
            safelyInTransaction(() -> templatesMap.putAll(seedRecipeStepTemplatesFromJson(root.get("recipe_step_templates"))), "seedRecipeStepTemplates");
            safelyInTransaction(() -> seedCocktailRecipeStepsFromJson(root.get("cocktail_recipe_steps"), templatesMap), "seedCocktailRecipeSteps");
            safelyInTransaction(() -> seedStockAdjustmentsFromJson(root.get("stock_adjustments")), "seedStockAdjustments");
            safelyInTransaction(() -> seedTableAppelsFromJson(root.get("table_appels"), tablesMap), "seedTableAppels");
            safelyInTransaction(this::seedSettingsAndConfig, "seedSettingsAndConfig");

            List<Cocktail> cocktails = cocktailRepository.findAll();
            if (!cocktails.isEmpty()) {
                safelyInTransaction(() -> seedOrdersFromJson(root.get("orders"), usersMap, tablesMap, cocktails), "seedOrders");
            }
            safelyInTransaction(() -> seedInvoicesFromJson(root.get("invoices"), tablesMap), "seedInvoices");
            safelyInTransaction(() -> seedAvoirsCreditFromJson(root.get("avoirs_credit")), "seedAvoirsCredit");

        } catch (Exception e) {
            log.error("Failed to seed demo dataset from JSON file '{}'", DATASET_PATH, e);
        }
    }

    private boolean isTestProfileActive() {
        if (environment == null) {
            return false;
        }
        return java.util.Arrays.asList(environment.getActiveProfiles()).contains("test");
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
            if (is != null) return is;
        }

        InputStream is = SampleDataSeederService.class.getClassLoader().getResourceAsStream(DATASET_PATH);
        if (is != null) return is;

        return SampleDataSeederService.class.getResourceAsStream("/" + DATASET_PATH);
    }

    private Map<String, User> seedUsersFromJson(JsonNode usersNode) {
        Map<String, User> usersMap = new HashMap<>();
        if (usersNode == null || !usersNode.isArray()) return usersMap;

        for (JsonNode uNode : usersNode) {
            String username = uNode.get("username").asText();
            String email = uNode.get("email").asText();
            String password = extractPasswordFromJson(uNode);
            String nom = uNode.get("nom").asText();
            String prenom = uNode.get("prenom").asText();

            Set<UserRole> roles = new HashSet<>();
            if (uNode.has(KEY_ROLES) && uNode.get(KEY_ROLES).isArray()) {
                for (JsonNode rNode : uNode.get(KEY_ROLES)) {
                    roles.add(UserRole.valueOf(rNode.asText()));
                }
            }

            User user = userRepository.findByUsername(username)
                    .or(() -> userRepository.findByEmail(email))
                    .map(existing -> {
                        existing.setUsername(username);
                        existing.setPassword(passwordEncoder.encode(password));
                        existing.setEmail(email);
                        existing.setNom(nom);
                        existing.setPrenom(prenom);
                        existing.setRoles(roles);
                        existing.setUpdatedAt(timeService.now());
                        return userRepository.save(existing);
                    }).orElseGet(() -> {
                        User u = new User();
                        u.setUsername(username);
                        u.setEmail(email);
                        u.setPassword(passwordEncoder.encode(password));
                        u.setNom(nom);
                        u.setPrenom(prenom);
                        u.setRoles(roles);
                        u.setCreatedAt(timeService.now());
                        u.setUpdatedAt(timeService.now());
                        return userRepository.save(u);
                    });

            usersMap.put(username, user);
        }
        return usersMap;
    }

    private String extractPasswordFromJson(JsonNode uNode) {
        if (uNode.has("authSecret")) {
            return uNode.get("authSecret").asText();
        }
        if (uNode.has("rawPassword")) {
            return uNode.get("rawPassword").asText();
        }
        if (uNode.has("password")) {
            return uNode.get("password").asText();
        }
        return "default123";
    }

    private void seedEtagesFromJson(JsonNode etagesNode) {
        if (etagesNode == null || !etagesNode.isArray()) return;

        for (JsonNode eNode : etagesNode) {
            String code = eNode.get("code").asText();
            String nom = eNode.get("nom").asText();
            int ordre = eNode.has("ordre") ? eNode.get("ordre").asInt() : 0;

            if (!etageRepository.existsByCode(code)) {
                EtageEntity e = new EtageEntity();
                e.setCode(code);
                e.setNom(nom);
                e.setOrdre(ordre);
                etageRepository.save(e);
                log.trace("Etage seeded: {}", nom);
            }
        }
    }

    private void seedZonesFromJson(JsonNode zonesNode) {
        if (zonesNode == null || !zonesNode.isArray()) return;

        for (JsonNode zNode : zonesNode) {
            String nom = zNode.get("nom").asText();
            ZoneEntity z = zoneRepository.findByNom(nom).orElseGet(() -> {
                ZoneEntity newZ = new ZoneEntity();
                newZ.setNom(nom);
                return newZ;
            });
            updateZoneFromNode(z, zNode);
            zoneRepository.save(z);
            log.trace("Zone seeded: {}", nom);
        }
    }

    private void updateZoneFromNode(ZoneEntity z, JsonNode zNode) {
        z.setEtage(zNode.get("etage").asText());
        z.setPlanX(zNode.hasNonNull(PLAN_X) ? zNode.get(PLAN_X).asDouble() : null);
        z.setPlanY(zNode.hasNonNull(PLAN_Y) ? zNode.get(PLAN_Y).asDouble() : null);
        z.setPlanWidth(zNode.hasNonNull(PLAN_WIDTH) ? zNode.get(PLAN_WIDTH).asDouble() : null);
        z.setPlanHeight(zNode.hasNonNull(PLAN_HEIGHT) ? zNode.get(PLAN_HEIGHT).asDouble() : null);
        z.setShapeType(zNode.hasNonNull("shapeType") ? zNode.get("shapeType").asText() : "rect");
        z.setPointsJson(zNode.hasNonNull("points") ? zNode.get("points").toString() : null);
        z.setCornerRadiiJson(zNode.hasNonNull("cornerRadii") ? zNode.get("cornerRadii").toString() : null);
        z.setCouleur(zNode.hasNonNull("couleur") ? zNode.get("couleur").asText() : null);
    }

    private Map<Integer, TableEntity> seedTablesFromJson(JsonNode tablesNode, Map<String, User> usersMap) {
        Map<Integer, TableEntity> tablesMap = new HashMap<>();
        if (tablesNode == null || !tablesNode.isArray()) return tablesMap;

        for (JsonNode tNode : tablesNode) {
            TableEntity table = createOrUpdateTableFromNode(tNode, usersMap);
            tablesMap.put(table.getNumero(), table);
        }
        return tablesMap;
    }

    private TableEntity createOrUpdateTableFromNode(JsonNode tNode, Map<String, User> usersMap) {
        int numero = tNode.get(KEY_NUMERO).asInt();
        String zone = tNode.get("zone").asText();
        int capacite = tNode.get("capacite").asInt();
        boolean occupee = tNode.get("occupee").asBoolean();
        String serveurUsername = tNode.hasNonNull(KEY_SERVEUR_USERNAME) ? tNode.get(KEY_SERVEUR_USERNAME).asText() : null;
        Double planX = tNode.get(PLAN_X).asDouble();
        Double planY = tNode.get(PLAN_Y).asDouble();
        String planForme = tNode.get("planForme").asText();
        Double planWidth = tNode.hasNonNull(PLAN_WIDTH) ? tNode.get(PLAN_WIDTH).asDouble() : null;
        Double planHeight = tNode.hasNonNull(PLAN_HEIGHT) ? tNode.get(PLAN_HEIGHT).asDouble() : null;
        Double planRotation = tNode.hasNonNull("planRotation") ? tNode.get("planRotation").asDouble() : 0.0;

        User serveur = serveurUsername != null ? usersMap.get(serveurUsername) : null;

        TableEntity t = tableRepository.findByNumero(numero).orElseGet(() -> {
            TableEntity table = new TableEntity();
            table.setNumero(numero);
            return table;
        });

        t.setZone(zone);
        t.setCapacite(capacite);
        t.setOccupee(occupee);
        t.setServeurId(serveur != null ? serveur.getId() : null);
        t.setPlanX(planX);
        t.setPlanY(planY);
        t.setPlanForme(planForme);
        t.setPlanWidth(planWidth);
        t.setPlanHeight(planHeight);
        t.setPlanRotation(planRotation);

        if (occupee) {
            int minOcc = tNode.has("minutesOccupation") ? tNode.get("minutesOccupation").asInt() : 5;
            t.setDateOccupation(timeService.now().minusMinutes(minOcc));
        } else {
            t.setDateOccupation(null);
            t.setDateLiberation(timeService.now().minusMinutes(45));
        }

        return tableRepository.save(t);
    }

    private void seedShiftPresetsFromJson(JsonNode presetsNode) {
        if (presetsNode == null || !presetsNode.isArray() || shiftPresetRepository.count() > 0) return;

        for (JsonNode pNode : presetsNode) {
            TypeShift type = TypeShift.valueOf(pNode.get("typeShift").asText());
            String nom = pNode.get("nom").asText();
            String debut = pNode.get("heureDebut").asText();
            String fin = pNode.get("heureFin").asText();
            int pause = pNode.has(KEY_DUREE_PAUSE_MINUTES) ? pNode.get(KEY_DUREE_PAUSE_MINUTES).asInt() : 30;

            if (shiftPresetRepository.findByTypeShift(type).isEmpty()) {
                ShiftPreset preset = new ShiftPreset(type, nom, debut, fin, pause);
                shiftPresetRepository.save(preset);
                log.trace("Shift preset seeded: {}", nom);
            }
        }
    }

    private record ShiftSeedDetail(
            LocalDate date,
            TypeShift shiftType,
            TypePoste poste,
            String heureDebut,
            String heureFin,
            String heurePauseDebut,
            int dureePause,
            BigDecimal heuresPrevues,
            BigDecimal heuresEffectuees,
            BigDecimal heuresSup
    ) {}

    private void seedShiftsFromJson(JsonNode shiftsNode, Map<String, User> usersMap) {
        if (shiftsNode == null || !shiftsNode.isArray()) return;

        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate monday = today.minusDays((long) today.getDayOfWeek().getValue() - 1);

        for (JsonNode sNode : shiftsNode) {
            seedSingleShiftFromJson(sNode, usersMap, monday, today);
        }
    }

    private void seedSingleShiftFromJson(JsonNode sNode, Map<String, User> usersMap, LocalDate monday, LocalDate today) {
        String username = sNode.get("username").asText();
        User user = usersMap.get(username);
        if (user == null) return;

        LocalDate shiftDate = resolveShiftDate(sNode, monday, today);
        TypeShift shiftType = TypeShift.valueOf(sNode.get("shiftType").asText());
        TypePoste poste = TypePoste.valueOf(sNode.get("poste").asText());
        String heureDebut = sNode.get("heureDebut").asText();
        String heureFin = sNode.get("heureFin").asText();
        String heurePauseDebut = sNode.hasNonNull("heurePauseDebut") ? sNode.get("heurePauseDebut").asText() : "13:00";
        int dureePause = sNode.hasNonNull(KEY_DUREE_PAUSE_MINUTES) ? sNode.get(KEY_DUREE_PAUSE_MINUTES).asInt() : 30;
        BigDecimal heuresPrevues = new BigDecimal(sNode.hasNonNull("heuresPrevues") ? sNode.get("heuresPrevues").asText() : "7.50");
        BigDecimal heuresEffectuees = new BigDecimal(sNode.hasNonNull("heuresEffectuees") ? sNode.get("heuresEffectuees").asText() : heuresPrevues.toString());
        BigDecimal heuresSup = new BigDecimal(sNode.hasNonNull("heuresSup") ? sNode.get("heuresSup").asText() : "0.00");
        String notes = sNode.hasNonNull(KEY_NOTES) ? sNode.get(KEY_NOTES).asText() : "Planning hebdo démo";

        boolean exists = employeeShiftRepository.findByUserId(user.getId()).stream()
                .anyMatch(s -> s.getDateShift().equals(shiftDate) && s.getTypeShift() == shiftType);

        if (!exists) {
            createAndSaveShift(user, new ShiftSeedDetail(shiftDate, shiftType, poste, heureDebut, heureFin, heurePauseDebut, dureePause, heuresPrevues, heuresEffectuees, heuresSup), notes);
        }
    }

    private LocalDate resolveShiftDate(JsonNode sNode, LocalDate monday, LocalDate today) {
        if (sNode.has("dayOffset")) {
            return monday.plusDays(sNode.get("dayOffset").asLong());
        }
        return today;
    }

    private void seedClosuresFromJson(JsonNode closuresNode) {
        if (closuresNode == null || !closuresNode.isArray() || establishmentClosureRepository.count() > 0) return;

        for (JsonNode cNode : closuresNode) {
            ClosureType type = ClosureType.valueOf(cNode.get("type").asText());
            DayOfWeek day = cNode.hasNonNull(KEY_DAY_OF_WEEK) ? DayOfWeek.valueOf(cNode.get(KEY_DAY_OF_WEEK).asText()) : null;
            LocalDate closureDate = cNode.hasNonNull("closureDate") ? LocalDate.parse(cNode.get("closureDate").asText()) : null;
            LocalDate endDate = cNode.hasNonNull("endDate") ? LocalDate.parse(cNode.get("endDate").asText()) : null;
            boolean isAnnual = cNode.hasNonNull("isAnnualRecurring") && cNode.get("isAnnualRecurring").asBoolean();
            String reason = cNode.hasNonNull("reason") ? cNode.get("reason").asText() : "Fermeture planifiée";

            EstablishmentClosure closure = new EstablishmentClosure(type, day, closureDate, endDate, isAnnual, reason);
            establishmentClosureRepository.save(closure);
            log.trace("Closure seeded: {} ({})", reason, type);
        }
    }

    private void seedWeekPublicationsFromJson(JsonNode pubsNode) {
        if (pubsNode == null || !pubsNode.isArray() || weekSchedulePublicationRepository.count() > 0) return;

        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate monday = today.minusDays((long) today.getDayOfWeek().getValue() - 1);

        for (JsonNode pNode : pubsNode) {
            long weekOffset = pNode.has("weekOffset") ? pNode.get("weekOffset").asLong() : 0L;
            LocalDate weekStart = monday.plusWeeks(weekOffset);
            String publishedBy = pNode.hasNonNull("publishedBy") ? pNode.get("publishedBy").asText() : "Directeur Démo";
            String snapshotJson = pNode.hasNonNull("snapshotJson") ? pNode.get("snapshotJson").asText() : "{}";

            if (weekSchedulePublicationRepository.findByWeekStart(weekStart).isEmpty()) {
                WeekSchedulePublication pub = new WeekSchedulePublication(weekStart, timeService.now(), publishedBy, snapshotJson);
                weekSchedulePublicationRepository.save(pub);
                log.trace("Week publication seeded for week: {}", weekStart);
            }
        }
    }

    private void createAndSaveShift(User user, ShiftSeedDetail detail, String notes) {
        EmployeeShift shift = new EmployeeShift();
        shift.setUser(user);
        shift.setDateShift(detail.date());
        shift.setTypeShift(detail.shiftType());
        shift.setTypePoste(detail.poste());
        shift.setHeureDebut(detail.heureDebut());
        shift.setHeureFin(detail.heureFin());
        shift.setHeurePauseDebut(detail.heurePauseDebut());
        shift.setDureePauseMinutes(detail.dureePause());
        shift.setHeuresPrevues(detail.heuresPrevues());
        shift.setHeuresEffectuees(detail.heuresEffectuees());
        shift.setHeuresSup(detail.heuresSup());
        shift.setNotes(notes);

        employeeShiftRepository.save(shift);
        log.trace("Shift seeded for user {} on {}", user.getUsername(), detail.date());
    }

    private void seedStockAdjustmentsFromJson(JsonNode adjustmentsNode) {
        if (adjustmentsNode == null || !adjustmentsNode.isArray()) return;

        for (JsonNode aNode : adjustmentsNode) {
            String ingName = aNode.get("nom").asText();
            BigDecimal stock = new BigDecimal(aNode.get("quantiteStock").asText());
            BigDecimal seuil = new BigDecimal(aNode.get("seuilAlerte").asText());

            ingredientRepository.findByNomIgnoreCase(ingName).ifPresent(ing -> {
                ing.setQuantiteStock(stock);
                ing.setSeuilAlerte(seuil);
                ingredientRepository.save(ing);
                log.trace("Stock adjustment applied: {} -> {} (seuil: {})", ingName, stock, seuil);
            });
        }
    }

    private void seedOrdersFromJson(JsonNode ordersNode, Map<String, User> usersMap, Map<Integer, TableEntity> tablesMap, List<Cocktail> cocktails) {
        if (ordersNode == null || !ordersNode.isArray()) return;

        for (JsonNode oNode : ordersNode) {
            createSingleOrderFromJson(oNode, usersMap, tablesMap, cocktails);
        }
    }

    private void createSingleOrderFromJson(JsonNode oNode, Map<String, User> usersMap, Map<Integer, TableEntity> tablesMap, List<Cocktail> cocktails) {
        int tableNumero = oNode.get(KEY_TABLE_NUMERO).asInt();
        String serveurUsername = oNode.hasNonNull(KEY_SERVEUR_USERNAME) ? oNode.get(KEY_SERVEUR_USERNAME).asText() : null;
        CommandeStatut statut = CommandeStatut.valueOf(oNode.get("statut").asText());
        int minutesAgo = oNode.get(KEY_MINUTES_AGO).asInt();
        String trackingToken = oNode.hasNonNull("trackingToken") ? oNode.get("trackingToken").asText() : null;
        String notes = oNode.hasNonNull(KEY_NOTES) ? oNode.get(KEY_NOTES).asText() : null;

        TableEntity table = tablesMap.get(tableNumero);
        User serveur = serveurUsername != null ? usersMap.get(serveurUsername) : null;
        LocalDateTime orderTime = timeService.now().minusMinutes(minutesAgo);

        Commande commande = (trackingToken != null ? commandeRepository.findByTrackingToken(trackingToken) : Optional.<Commande>empty())
                .orElseGet(Commande::new);
        commande.setTable(table);
        commande.setServeur(serveur);
        commande.setStatut(statut);
        commande.setDateCommande(orderTime);
        commande.setTrackingToken(trackingToken);
        commande.setNotes(notes);

        applyOrderTimestamps(commande, statut, orderTime);

        Commande savedOrder = commandeRepository.save(commande);
        List<CommandeItem> items = parseOrderItems(savedOrder, oNode.get(KEY_ITEMS), cocktails);
        savedOrder.setItems(items);
        BigDecimal totalOrder = BigDecimal.ZERO;
        boolean hasPrioritaireItem = false;
        for (CommandeItem item : items) {
            if (item != null && item.getPrixUnitaire() != null) {
                totalOrder = totalOrder.add(item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite())));
            }
            if (item != null && item.isPrioritaire()) {
                hasPrioritaireItem = true;
            }
        }
        savedOrder.setTotal(totalOrder);
        if (hasPrioritaireItem) {
            savedOrder.setPrioritaire(true);
        }
        commandeRepository.save(savedOrder);
    }

    private void applyOrderTimestamps(Commande commande, CommandeStatut statut, LocalDateTime orderTime) {
        if (statut == CommandeStatut.PRET || statut == CommandeStatut.LIVREE || statut == CommandeStatut.REGLEE) {
            commande.setDatePreparation(orderTime.plusMinutes(4));
            commande.setDatePret(orderTime.plusMinutes(8));
        }
        if (statut == CommandeStatut.LIVREE || statut == CommandeStatut.REGLEE) {
            commande.setDateLivraison(orderTime.plusMinutes(10));
        }
        if (statut == CommandeStatut.REGLEE) {
            commande.setDateReglement(orderTime.plusMinutes(35));
        }
        if (statut == CommandeStatut.ANNULEE) {
            commande.setDateModification(orderTime.plusMinutes(2));
        }
    }

    private List<CommandeItem> parseOrderItems(Commande order, JsonNode itemsNode, List<Cocktail> cocktails) {
        List<CommandeItem> items = new ArrayList<>();
        if (itemsNode == null || !itemsNode.isArray()) return items;

        for (JsonNode itemNode : itemsNode) {
            String cocktailName = itemNode.get("cocktailName").asText();
            int quantite = itemNode.get(KEY_QUANTITE).asInt();
            boolean prioritaire = itemNode.hasNonNull("prioritaire") && itemNode.get("prioritaire").asBoolean();
            String itemNotes = itemNode.hasNonNull("itemNotes") ? itemNode.get("itemNotes").asText() : null;

            Cocktail cocktail = findCocktailByName(cocktails, cocktailName);
            if (cocktail != null) {
                CommandeItem ci = new CommandeItem();
                ci.setCommande(order);
                ci.setCocktail(cocktail);
                ci.setQuantite(quantite);
                ci.setPrioritaire(prioritaire);
                ci.setNotes(itemNotes);
                ci.setPrixUnitaire(cocktail.getPrix());
                items.add(ci);
            }
        }
        return items;
    }

    private void seedInvoicesFromJson(JsonNode invoicesNode, Map<Integer, TableEntity> tablesMap) {
        if (invoicesNode == null || !invoicesNode.isArray()) return;

        for (JsonNode invNode : invoicesNode) {
            createSingleInvoiceFromJson(invNode, tablesMap);
        }
    }

    private void createSingleInvoiceFromJson(JsonNode invNode, Map<Integer, TableEntity> tablesMap) {
        String numero = invNode.get(KEY_NUMERO).asText();
        int tableNumero = invNode.get(KEY_TABLE_NUMERO).asInt();
        boolean reglee = invNode.get("reglee").asBoolean();
        String modePaiement = invNode.hasNonNull(KEY_MODE_PAIEMENT) ? invNode.get(KEY_MODE_PAIEMENT).asText() : null;
        BigDecimal pourboire = invNode.has(KEY_POURBOIRE) ? new BigDecimal(invNode.get(KEY_POURBOIRE).asText()) : BigDecimal.ZERO;
        int minutesAgo = invNode.get(KEY_MINUTES_AGO).asInt();
        String notes = invNode.hasNonNull(KEY_NOTES) ? invNode.get(KEY_NOTES).asText() : null;

        TableEntity table = tablesMap.get(tableNumero);
        LocalDateTime invoiceTime = timeService.now().minusMinutes(minutesAgo);

        Facture f = factureRepository.findByNumero(numero)
                .orElseGet(() -> buildInvoiceEntity(table, numero, reglee, modePaiement, pourboire, invoiceTime, notes));
        f.setTable(table);
        f.setReglee(reglee);
        f.setModePaiement(modePaiement);
        f.setPourboire(pourboire);
        f.setDateFacture(invoiceTime);
        f.setNotes(notes);

        if (reglee) {
            f.setDateReglement(invoiceTime.plusMinutes(35));
            f.setFinalized(true);
            f.setFinalizedAt(invoiceTime.plusMinutes(35));
            f.setRetentionUntil(invoiceTime.plusYears(10));
        }

        List<Commande> tableOrders = table != null ? commandeRepository.findByTable(table) : List.of();
        Commande latestOrder = !tableOrders.isEmpty() ? tableOrders.get(tableOrders.size() - 1) : null;

        BigDecimal total = parseInvoiceItems(f, invNode.get(KEY_ITEMS), latestOrder);
        f.setTotal(total);
        f.setTotalTTC(total);
        Facture savedFacture = factureRepository.save(f);

        if (invNode.has(KEY_REGLEMENTS) && invNode.get(KEY_REGLEMENTS).isArray() && savedFacture.getReglements().isEmpty()) {
            seedInvoiceReglements(savedFacture, invNode.get(KEY_REGLEMENTS), invoiceTime);
        }
    }

    private Facture buildInvoiceEntity(TableEntity table, String numero, boolean reglee, String modePaiement, BigDecimal pourboire, LocalDateTime invoiceTime, String notes) {
        Facture f = new Facture();
        f.setTable(table);
        f.setNumero(numero);
        f.setReglee(reglee);
        f.setModePaiement(modePaiement);
        f.setPourboire(pourboire);
        f.setTotal(BigDecimal.ZERO);
        f.setTotalHT(BigDecimal.ZERO);
        f.setTotalVAT(BigDecimal.ZERO);
        f.setTotalTTC(BigDecimal.ZERO);
        f.setDateFacture(invoiceTime);
        f.setNotes(notes);

        if (reglee) {
            f.setDateReglement(invoiceTime.plusMinutes(35));
            f.setFinalized(true);
            f.setFinalizedAt(invoiceTime.plusMinutes(35));
            f.setRetentionUntil(invoiceTime.plusYears(10));
        }
        return f;
    }

    private void seedInvoiceReglements(Facture savedFacture, JsonNode reglementsNode, LocalDateTime invoiceTime) {
        List<FactureReglement> reglementsList = new ArrayList<>();
        for (JsonNode rNode : reglementsNode) {
            FactureReglement fr = new FactureReglement();
            fr.setFacture(savedFacture);
            fr.setNomConvive(rNode.get("nomConvive").asText());
            fr.setPartIndex(rNode.get("partIndex").asInt());
            fr.setTotalParts(rNode.has("totalParts") ? rNode.get("totalParts").asInt() : null);
            BigDecimal partMontant = new BigDecimal(rNode.get("montant").asText());
            BigDecimal partPourboire = rNode.has(KEY_POURBOIRE) ? new BigDecimal(rNode.get(KEY_POURBOIRE).asText()) : BigDecimal.ZERO;
            fr.setMontant(partMontant);
            fr.setPourboire(partPourboire);
            fr.setTotalRegle(partMontant.add(partPourboire));
            fr.setModePaiement(rNode.get(KEY_MODE_PAIEMENT).asText());
            fr.setTypeSplit(rNode.has("typeSplit") ? rNode.get("typeSplit").asText() : "EGAL");
            if (rNode.hasNonNull("itemsJson")) {
                fr.setItemsJson(rNode.get("itemsJson").asText());
            }
            fr.setDateReglement(invoiceTime.plusMinutes(35));
            factureReglementRepository.save(fr);
            reglementsList.add(fr);
        }
        savedFacture.setReglements(reglementsList);
    }

    private void seedAvoirsCreditFromJson(JsonNode avoirsNode) {
        if (avoirsNode == null || !avoirsNode.isArray()) return;

        for (JsonNode aNode : avoirsNode) {
            String invoiceNumber = aNode.get("factureNumero").asText();
            factureRepository.findByNumero(invoiceNumber).ifPresent(facture -> {
                String avoirNumero = aNode.get(KEY_NUMERO).asText();
                if (avoirCreditRepository.findByNumero(avoirNumero).isEmpty()) {
                    AvoirCredit avoir = new AvoirCredit();
                    avoir.setNumero(avoirNumero);
                    avoir.setFacture(facture);
                    avoir.setTotalHT(facture.getTotalHT());
                    avoir.setTotalVAT(facture.getTotalVAT());
                    avoir.setTotalTTC(facture.getTotalTTC());
                    avoir.setMotif(aNode.get("motif").asText());
                    avoirCreditRepository.save(avoir);
                    log.trace("Avoir de credit seeded: {}", avoirNumero);
                }
            });
        }
    }

    private BigDecimal parseInvoiceItems(Facture f, JsonNode itemsNode, Commande latestOrder) {
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal totalHT = BigDecimal.ZERO;
        BigDecimal totalVAT = BigDecimal.ZERO;
        List<FactureItem> items = new ArrayList<>();

        if (itemsNode != null && itemsNode.isArray()) {
            for (JsonNode itemNode : itemsNode) {
                String description = itemNode.get(KEY_DESCRIPTION).asText();
                int quantite = itemNode.get(KEY_QUANTITE).asInt();
                BigDecimal prixUnitaire = new BigDecimal(itemNode.get("prixUnitaire").asText());
                BigDecimal itemTotal = prixUnitaire.multiply(BigDecimal.valueOf(quantite));

                VatRate vatRate = resolveInvoiceItemVatRate(description);
                BigDecimal rateMultiplier = BigDecimal.ONE.add(vatRate.getRate());
                BigDecimal priceHT = itemTotal.divide(rateMultiplier, 2, RoundingMode.HALF_UP);
                BigDecimal vatAmount = itemTotal.subtract(priceHT);

                FactureItem fi = new FactureItem();
                fi.setFacture(f);
                fi.setDescription(description);
                fi.setQuantite(quantite);
                fi.setPrixUnitaire(prixUnitaire);
                fi.setTotal(itemTotal);
                fi.setVatRate(vatRate);
                fi.setPriceHT(priceHT);
                fi.setVatAmount(vatAmount);

                if (latestOrder != null && latestOrder.getItems() != null) {
                    latestOrder.getItems().stream()
                            .filter(ci -> ci.getCocktail() != null && ci.getCocktail().getNom().equalsIgnoreCase(description))
                            .findFirst()
                            .ifPresent(fi::setCommandeItem);
                }

                items.add(fi);

                total = total.add(itemTotal);
                totalHT = totalHT.add(priceHT);
                totalVAT = totalVAT.add(vatAmount);
            }
        }
        f.setItems(items);
        f.setTotalHT(totalHT);
        f.setTotalVAT(totalVAT);
        f.setTotalTTC(total);
        return total;
    }

    private VatRate resolveInvoiceItemVatRate(String description) {
        String lower = description.toLowerCase();
        if (lower.contains("planche") || lower.contains("nachos") || lower.contains("frites") || lower.contains("snack")) {
            return VatRate.FIVE_FIVE;
        }
        if (lower.contains("virgin") || lower.contains("jus") || lower.contains("eau") || lower.contains("coca") || lower.contains("limonade")) {
            return VatRate.TEN;
        }
        return VatRate.TWENTY;
    }

    private Cocktail findCocktailByName(List<Cocktail> cocktails, String name) {
        return cocktails.stream()
                .filter(c -> c.getNom().equalsIgnoreCase(name))
                .findFirst()
                .orElse(cocktails.get(0));
    }

    private Map<String, RecipeStepTemplate> seedRecipeStepTemplatesFromJson(JsonNode templatesNode) {
        Map<String, RecipeStepTemplate> map = new HashMap<>();
        if (templatesNode == null || !templatesNode.isArray()) return map;

        for (JsonNode node : templatesNode) {
            String name = node.get("name").asText();
            RecipeStepTemplate template = recipeStepTemplateRepository.findByName(name)
                .orElseGet(() -> createTemplateFromNode(node, name));
            map.put(name, template);
        }
        return map;
    }

    private RecipeStepTemplate createTemplateFromNode(JsonNode node, String name) {
        RecipeStepTemplate t = new RecipeStepTemplate();
        t.setName(name);
        t.setActionType(RecipeStepActionType.valueOf(node.get("actionType").asText()));
        t.setDefaultDurationSeconds(node.has("defaultDurationSeconds") ? node.get("defaultDurationSeconds").asInt() : 0);
        t.setIcon(node.has("icon") ? node.get("icon").asText() : null);
        t.setDescription(node.has(KEY_DESCRIPTION) ? node.get(KEY_DESCRIPTION).asText() : null);
        t.setPredefined(node.has("isPredefined") && node.get("isPredefined").asBoolean());
        t.setCreatedAt(timeService.now());
        t.setUpdatedAt(timeService.now());
        return recipeStepTemplateRepository.save(t);
    }

    private void seedCocktailRecipeStepsFromJson(JsonNode cocktailStepsNode, Map<String, RecipeStepTemplate> templatesMap) {
        if (cocktailStepsNode == null || !cocktailStepsNode.isArray()) return;

        for (JsonNode cocktailNode : cocktailStepsNode) {
            seedSingleCocktailSteps(cocktailNode, templatesMap);
        }
    }

    private void seedSingleCocktailSteps(JsonNode cocktailNode, Map<String, RecipeStepTemplate> templatesMap) {
        String cocktailName = cocktailNode.get("cocktailName").asText();
        Cocktail cocktail = cocktailRepository.findByNomIgnoreCaseWithRecipeSteps(cocktailName).orElse(null);
        if (cocktail == null) return;

        JsonNode stepsNode = cocktailNode.get("steps");
        if (stepsNode == null || !stepsNode.isArray()) {
            return;
        }

        List<CocktailRecipeStep> steps = new ArrayList<>();
        for (JsonNode stepNode : stepsNode) {
            steps.add(buildSingleRecipeStep(cocktail, stepNode, templatesMap));
        }
        if (cocktail.getRecipeSteps() != null) {
            cocktail.getRecipeSteps().clear();
            cocktail.getRecipeSteps().addAll(steps);
        } else {
            cocktail.setRecipeSteps(steps);
        }
        cocktailRepository.save(cocktail);
    }

    private CocktailRecipeStep buildSingleRecipeStep(Cocktail cocktail, JsonNode stepNode, Map<String, RecipeStepTemplate> templatesMap) {
        CocktailRecipeStep step = new CocktailRecipeStep();
        step.setCocktail(cocktail);
        step.setStepOrder(stepNode.get("stepOrder").asInt());
        step.setStepType(RecipeStepType.valueOf(stepNode.get("stepType").asText()));
        if (stepNode.has(KEY_QUANTITE)) {
            step.setQuantite(new BigDecimal(stepNode.get(KEY_QUANTITE).asText()));
        }
        if (stepNode.has("unite")) {
            step.setUnite(stepNode.get("unite").asText());
        }
        if (stepNode.has("actionTitle")) {
            step.setActionTitle(stepNode.get("actionTitle").asText());
        }
        if (stepNode.has("customText")) {
            step.setCustomText(stepNode.get("customText").asText());
        }
        if (stepNode.has("durationSeconds")) {
            step.setDurationSeconds(stepNode.get("durationSeconds").asInt());
        }
        if (stepNode.has("ingredientName")) {
            String ingName = stepNode.get("ingredientName").asText();
            Ingredient ing = ingredientRepository.findByNomIgnoreCase(ingName).orElse(null);
            step.setIngredient(ing);
        }
        if (stepNode.has("templateName")) {
            String tplName = stepNode.get("templateName").asText();
            RecipeStepTemplate tpl = templatesMap.getOrDefault(tplName, recipeStepTemplateRepository.findByName(tplName).orElse(null));
            step.setTemplate(tpl);
        }
        step.setCreatedAt(timeService.now());
        step.setUpdatedAt(timeService.now());
        return step;
    }

    private void seedTableAppelsFromJson(JsonNode appelsNode, Map<Integer, TableEntity> tablesMap) {
        if (appelsNode == null || !appelsNode.isArray() || tableAppelRepository.count() > 0) {
            return;
        }

        LocalDateTime now = timeService.now();

        for (JsonNode appelNode : appelsNode) {
            int tableNumero = appelNode.path(KEY_TABLE_NUMERO).asInt(1);
            TableEntity table = tablesMap.get(tableNumero);
            if (table == null) {
                table = tableRepository.findByNumero(tableNumero).orElse(null);
            }
            if (table == null) {
                continue;
            }

            TableAppelType type = TableAppelType.valueOf(appelNode.path("type").asText("ASSISTANCE"));
            TableAppelStatut statut = TableAppelStatut.valueOf(appelNode.path("statut").asText("EN_ATTENTE"));
            String commentaire = appelNode.hasNonNull("commentaire") ? appelNode.path("commentaire").asText() : null;
            int minutesAgo = appelNode.path(KEY_MINUTES_AGO).asInt(2);

            TableAppel appel = new TableAppel();
            appel.setTable(table);
            appel.setType(type);
            appel.setStatut(statut);
            appel.setCommentaire(commentaire);
            appel.setCreatedAt(now.minusMinutes(minutesAgo));
            appel.setUpdatedAt(now.minusMinutes(minutesAgo));

            if (statut == TableAppelStatut.ACQUITTE) {
                appel.setAcquittePar(appelNode.path("acquittePar").asText("serveur1"));
                appel.setAcquitteAt(now.minusMinutes(Math.max(0, minutesAgo - 1)));
            }

            tableAppelRepository.save(appel);
        }
        log.info("Seeded table call alerts from demo dataset.");
    }

    private void seedSettingsAndConfig() {
        if (!appSettingsRepository.existsById(AppSettings.SINGLETON_ID)) {
            appSettingsRepository.save(new AppSettings());
            log.info("Seeded default AppSettings singleton.");
        }
        if (!establishmentConfigRepository.existsById(EstablishmentConfig.SINGLETON_ID)) {
            EstablishmentConfig config = new EstablishmentConfig();
            config.setId(EstablishmentConfig.SINGLETON_ID);
            establishmentConfigRepository.save(config);
            log.info("Seeded default EstablishmentConfig singleton.");
        }
    }
}
