package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Service responsible for automatically seeding a rich, complete demonstration dataset
 * (Users, Zones, Tables, Shifts, Active Orders, Overdue Orders, Paid & Pending Invoices)
 * from the JSON dataset file 'data/demo_dataset.json' on application startup in 'dev' and 'test' profiles.
 */
@Service
@Transactional
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

    private final UserRepository userRepository;
    private final TableRepository tableRepository;
    private final ZoneRepository zoneRepository;
    private final EtageRepository etageRepository;
    private final CocktailRepository cocktailRepository;
    private final CommandeRepository commandeRepository;
    private final FactureRepository factureRepository;
    private final EmployeeShiftRepository employeeShiftRepository;
    private final EstablishmentClosureRepository establishmentClosureRepository;
    private final PasswordEncoder passwordEncoder;
    private final TimeService timeService;
    private final ObjectMapper objectMapper;

    public SampleDataSeederService(
            UserRepository userRepository,
            TableRepository tableRepository,
            ZoneRepository zoneRepository,
            EtageRepository etageRepository,
            CocktailRepository cocktailRepository,
            CommandeRepository commandeRepository,
            FactureRepository factureRepository,
            EmployeeShiftRepository employeeShiftRepository,
            EstablishmentClosureRepository establishmentClosureRepository,
            PasswordEncoder passwordEncoder,
            TimeService timeService) {
        this.userRepository = userRepository;
        this.tableRepository = tableRepository;
        this.zoneRepository = zoneRepository;
        this.etageRepository = etageRepository;
        this.cocktailRepository = cocktailRepository;
        this.commandeRepository = commandeRepository;
        this.factureRepository = factureRepository;
        this.employeeShiftRepository = employeeShiftRepository;
        this.establishmentClosureRepository = establishmentClosureRepository;
        this.passwordEncoder = passwordEncoder;
        this.timeService = timeService;
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void seedDemoDataIfEmpty() {
        if (commandeRepository.count() > 0) {
            log.info("Database already contains orders, skipping demo dataset seeding.");
            return;
        }

        log.info("Starting complete demo dataset seeding from JSON asset '{}'...", DATASET_PATH);
        seedAllDemoData();
        log.info("Demo dataset seeding successfully finished.");
    }

    public void seedAllDemoData() {
        InputStream is = loadResourceStream();
        if (is == null) {
            log.warn("Demo dataset JSON file '{}' not found in classpath.", DATASET_PATH);
            return;
        }

        try (InputStream stream = is) {
            JsonNode root = objectMapper.readTree(stream);

            Map<String, User> usersMap = seedUsersFromJson(root.get("users"));
            seedEtagesFromJson(root.get("etages"));
            seedZonesFromJson(root.get("zones"));
            Map<Integer, TableEntity> tablesMap = seedTablesFromJson(root.get("tables"), usersMap);
            seedShiftsFromJson(root.get("shifts"), usersMap);
            seedClosuresFromJson(root.get("closures"));

            if (commandeRepository.count() == 0) {
                List<Cocktail> cocktails = cocktailRepository.findAll();
                if (!cocktails.isEmpty()) {
                    seedOrdersFromJson(root.get("orders"), usersMap, tablesMap, cocktails);
                    seedInvoicesFromJson(root.get("invoices"), tablesMap);
                }
            }

        } catch (Exception e) {
            log.error("Failed to seed demo dataset from JSON file '{}'", DATASET_PATH, e);
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

            User user = userRepository.findByUsername(username).map(existing -> {
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

    private static final String PLAN_X = "planX";
    private static final String PLAN_Y = "planY";
    private static final String PLAN_WIDTH = "planWidth";
    private static final String PLAN_HEIGHT = "planHeight";

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
        int numero = tNode.get("numero").asInt();
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
            t.setDateOccupation(timeService.now().minusMinutes(25));
        } else {
            t.setDateOccupation(null);
            t.setDateLiberation(timeService.now().minusMinutes(45));
        }

        return tableRepository.save(t);
    }

    private record ShiftSeedDetail(
            LocalDate date,
            TypeShift shiftType,
            TypePoste poste,
            String debut,
            String fin,
            String pauseDebut,
            int pauseMin,
            BigDecimal prevues
    ) {}

    /**
     * Seeds shifts dynamically from the provided JSON node.
     *
     * @param shiftsNode JSON array node containing shifts
     * @param usersMap map of usernames to persisted User entities
     */
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
        int dureePause = sNode.hasNonNull("dureePauseMinutes") ? sNode.get("dureePauseMinutes").asInt() : 30;
        BigDecimal heuresPrevues = sNode.hasNonNull("heuresPrevues") ? new BigDecimal(sNode.get("heuresPrevues").asText()) : new BigDecimal("7.50");
        String notes = sNode.hasNonNull(KEY_NOTES) ? sNode.get(KEY_NOTES).asText() : "Planning hebdo démo";

        boolean exists = employeeShiftRepository.findByUserId(user.getId()).stream()
                .anyMatch(s -> s.getDateShift().equals(shiftDate) && s.getTypeShift() == shiftType);

        if (!exists) {
            createAndSaveShift(user, new ShiftSeedDetail(shiftDate, shiftType, poste, heureDebut, heureFin, heurePauseDebut, dureePause, heuresPrevues), notes);
        }
    }

    private LocalDate resolveShiftDate(JsonNode sNode, LocalDate monday, LocalDate today) {
        if (sNode.has("dayOffset")) {
            return monday.plusDays(sNode.get("dayOffset").asLong());
        }
        if (sNode.has(KEY_DAY_OF_WEEK)) {
            DayOfWeek dow = DayOfWeek.valueOf(sNode.get(KEY_DAY_OF_WEEK).asText());
            return monday.plusDays((long) dow.getValue() - 1);
        }
        if (sNode.has("date")) {
            return LocalDate.parse(sNode.get("date").asText());
        }
        return today;
    }

    /**
     * Seeds establishment closures from the provided JSON node.
     *
     * @param closuresNode JSON array node containing closure definitions
     */
    private void seedClosuresFromJson(JsonNode closuresNode) {
        if (closuresNode == null || !closuresNode.isArray() || establishmentClosureRepository.count() > 0) return;

        for (JsonNode cNode : closuresNode) {
            EstablishmentClosure closure = new EstablishmentClosure();
            ClosureType type = ClosureType.valueOf(cNode.get("type").asText());
            closure.setType(type);

            if (cNode.hasNonNull(KEY_DAY_OF_WEEK)) {
                closure.setDayOfWeek(DayOfWeek.valueOf(cNode.get(KEY_DAY_OF_WEEK).asText()));
            }
            if (cNode.hasNonNull("closureDate")) {
                closure.setClosureDate(LocalDate.parse(cNode.get("closureDate").asText()));
            }
            if (cNode.hasNonNull("endDate")) {
                closure.setEndDate(LocalDate.parse(cNode.get("endDate").asText()));
            }
            if (cNode.has("isAnnualRecurring")) {
                closure.setIsAnnualRecurring(cNode.get("isAnnualRecurring").asBoolean());
            }
            closure.setReason(cNode.get("reason").asText());

            establishmentClosureRepository.save(closure);
            log.trace("Establishment closure seeded: {}", closure.getReason());
        }
    }

    private void createAndSaveShift(User user, ShiftSeedDetail detail, String notes) {
        EmployeeShift shift = new EmployeeShift();
        shift.setUser(user);
        shift.setDateShift(detail.date());
        shift.setTypeShift(detail.shiftType());
        shift.setTypePoste(detail.poste());
        shift.setHeureDebut(detail.debut());
        shift.setHeureFin(detail.fin());
        shift.setHeurePauseDebut(detail.pauseDebut());
        shift.setDureePauseMinutes(detail.pauseMin());
        shift.setHeuresPrevues(detail.prevues());
        shift.setHeuresEffectuees(detail.prevues());
        shift.setNotes(notes);
        employeeShiftRepository.save(shift);
    }

    private void seedOrdersFromJson(JsonNode ordersNode, Map<String, User> usersMap, Map<Integer, TableEntity> tablesMap, List<Cocktail> cocktails) {
        if (ordersNode == null || !ordersNode.isArray()) return;
        for (JsonNode oNode : ordersNode) {
            createSingleOrderFromJson(oNode, usersMap, tablesMap, cocktails);
        }
    }

    private void createSingleOrderFromJson(JsonNode oNode, Map<String, User> usersMap, Map<Integer, TableEntity> tablesMap, List<Cocktail> cocktails) {
        int tableNumero = oNode.get("tableNumero").asInt();
        String serveurUsername = oNode.get(KEY_SERVEUR_USERNAME).asText();
        CommandeStatut statut = CommandeStatut.valueOf(oNode.get("statut").asText());
        int minutesAgo = oNode.get("minutesAgo").asInt();
        String notes = oNode.hasNonNull(KEY_NOTES) ? oNode.get(KEY_NOTES).asText() : null;

        TableEntity table = tablesMap.get(tableNumero);
        User serveur = usersMap.get(serveurUsername);
        LocalDateTime orderTime = timeService.now().minusMinutes(minutesAgo);

        Commande cmd = new Commande();
        cmd.setTable(table);
        cmd.setServeur(serveur);
        cmd.setStatut(statut);
        cmd.setDateCommande(orderTime);
        cmd.setTrackingToken("TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cmd.setNotes(notes);

        List<CommandeItem> items = buildOrderItems(cmd, oNode.get(KEY_ITEMS), cocktails);
        BigDecimal total = BigDecimal.ZERO;
        for (CommandeItem it : items) {
            total = total.add(it.getPrixUnitaire().multiply(BigDecimal.valueOf(it.getQuantite())));
        }

        cmd.setItems(items);
        cmd.setTotal(total);

        updateOrderTimestampsByStatus(cmd, statut, orderTime);
        commandeRepository.save(cmd);
    }

    private List<CommandeItem> buildOrderItems(Commande cmd, JsonNode itemsNode, List<Cocktail> cocktails) {
        List<CommandeItem> items = new ArrayList<>();
        if (itemsNode == null || !itemsNode.isArray()) {
            return items;
        }

        for (JsonNode itemNode : itemsNode) {
            CommandeItem item = buildSingleCommandeItem(cmd, itemNode, cocktails);
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    private CommandeItem buildSingleCommandeItem(Commande cmd, JsonNode itemNode, List<Cocktail> cocktails) {
        String cocktailName = itemNode.get("cocktailName").asText();
        Cocktail c = findCocktailByName(cocktails, cocktailName);
        if (c == null) {
            return null;
        }

        int quantite = itemNode.has(KEY_QUANTITE) ? itemNode.get(KEY_QUANTITE).asInt() : 1;
        BigDecimal unitPrice = c.getPrix() != null ? c.getPrix() : new BigDecimal("9.50");

        CommandeItem item = new CommandeItem();
        item.setCommande(cmd);
        item.setCocktail(c);
        item.setQuantite(quantite);

        if (itemNode.hasNonNull("varianteName") && c.getVariantes() != null) {
            String vNom = itemNode.get("varianteName").asText();
            c.getVariantes().stream()
                    .filter(v -> v.getNom().equalsIgnoreCase(vNom))
                    .findFirst()
                    .ifPresent(v -> {
                        item.setVariante(v);
                        if (v.getPrixSupplement() != null) {
                            item.setPrixUnitaire(unitPrice.add(v.getPrixSupplement()));
                        }
                    });
        }
        if (item.getPrixUnitaire() == null) {
            item.setPrixUnitaire(unitPrice);
        }
        return item;
    }

    private void updateOrderTimestampsByStatus(Commande cmd, CommandeStatut statut, LocalDateTime orderTime) {
        if (statut == CommandeStatut.EN_PREPARATION) {
            cmd.setDatePreparation(orderTime.plusMinutes(2));
        } else if (statut == CommandeStatut.PRET) {
            cmd.setDatePreparation(orderTime.plusMinutes(2));
        } else if (statut == CommandeStatut.LIVREE) {
            cmd.setDatePreparation(orderTime.plusMinutes(2));
            cmd.setDateLivraison(orderTime.plusMinutes(7));
        } else if (statut == CommandeStatut.REGLEE) {
            cmd.setDatePreparation(orderTime.plusMinutes(2));
            cmd.setDateLivraison(orderTime.plusMinutes(7));
            cmd.setDateReglement(orderTime.plusMinutes(35));
        }
    }

    private void seedInvoicesFromJson(JsonNode invoicesNode, Map<Integer, TableEntity> tablesMap) {
        if (invoicesNode == null || !invoicesNode.isArray()) return;
        for (JsonNode invNode : invoicesNode) {
            createSingleInvoiceFromJson(invNode, tablesMap);
        }
    }

    private void createSingleInvoiceFromJson(JsonNode invNode, Map<Integer, TableEntity> tablesMap) {
        String numero = invNode.get("numero").asText();
        int tableNumero = invNode.get("tableNumero").asInt();
        boolean reglee = invNode.get("reglee").asBoolean();
        String modePaiement = invNode.hasNonNull("modePaiement") ? invNode.get("modePaiement").asText() : null;
        BigDecimal pourboire = invNode.has("pourboire") ? new BigDecimal(invNode.get("pourboire").asText()) : BigDecimal.ZERO;
        int minutesAgo = invNode.get("minutesAgo").asInt();
        String notes = invNode.hasNonNull(KEY_NOTES) ? invNode.get(KEY_NOTES).asText() : null;

        TableEntity table = tablesMap.get(tableNumero);
        LocalDateTime invoiceTime = timeService.now().minusMinutes(minutesAgo);

        Facture f = new Facture();
        f.setTable(table);
        f.setNumero(numero);
        f.setReglee(reglee);
        f.setModePaiement(modePaiement);
        f.setPourboire(pourboire);
        f.setDateFacture(invoiceTime);
        f.setNotes(notes);

        if (reglee) {
            f.setDateReglement(invoiceTime.plusMinutes(35));
            f.setFinalized(true);
            f.setFinalizedAt(invoiceTime.plusMinutes(35));
        }

        BigDecimal total = parseInvoiceItems(f, invNode.get(KEY_ITEMS));
        f.setTotal(total);
        f.setTotalHT(total.multiply(new BigDecimal("0.8333")));
        f.setTotalVAT(total.multiply(new BigDecimal("0.1667")));
        f.setTotalTTC(total);

        factureRepository.save(f);
    }

    private BigDecimal parseInvoiceItems(Facture f, JsonNode itemsNode) {
        BigDecimal total = BigDecimal.ZERO;
        List<FactureItem> items = new ArrayList<>();

        if (itemsNode != null && itemsNode.isArray()) {
            for (JsonNode itemNode : itemsNode) {
                String description = itemNode.get("description").asText();
                int quantite = itemNode.get(KEY_QUANTITE).asInt();
                BigDecimal prixUnitaire = new BigDecimal(itemNode.get("prixUnitaire").asText());
                BigDecimal itemTotal = prixUnitaire.multiply(BigDecimal.valueOf(quantite));

                FactureItem fi = new FactureItem();
                fi.setFacture(f);
                fi.setDescription(description);
                fi.setQuantite(quantite);
                fi.setPrixUnitaire(prixUnitaire);
                fi.setTotal(itemTotal);
                items.add(fi);

                total = total.add(itemTotal);
            }
        }
        f.setItems(items);
        return total;
    }

    private Cocktail findCocktailByName(List<Cocktail> cocktails, String name) {
        return cocktails.stream()
                .filter(c -> c.getNom().equalsIgnoreCase(name))
                .findFirst()
                .orElse(cocktails.get(0));
    }
}
