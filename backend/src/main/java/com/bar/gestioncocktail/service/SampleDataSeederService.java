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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service responsible for automatically seeding a rich, complete demonstration dataset
 * (Users, Zones, Tables, Shifts, Active Orders, Overdue Orders, Paid & Pending Invoices)
 * from the JSON dataset file 'data/demo_dataset.json' on application startup in 'dev' and 'test' profiles.
 */
@Service
@Profile({"dev", "test"})
public class SampleDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(SampleDataSeederService.class);
    private static final String DATASET_PATH = "data/demo_dataset.json";

    private final UserRepository userRepository;
    private final TableRepository tableRepository;
    private final ZoneRepository zoneRepository;
    private final CocktailRepository cocktailRepository;
    private final CommandeRepository commandeRepository;
    private final FactureRepository factureRepository;
    private final EmployeeShiftRepository employeeShiftRepository;
    private final PasswordEncoder passwordEncoder;
    private final TimeService timeService;
    private final ObjectMapper objectMapper;

    public SampleDataSeederService(
            UserRepository userRepository,
            TableRepository tableRepository,
            ZoneRepository zoneRepository,
            CocktailRepository cocktailRepository,
            CommandeRepository commandeRepository,
            FactureRepository factureRepository,
            EmployeeShiftRepository employeeShiftRepository,
            PasswordEncoder passwordEncoder,
            TimeService timeService,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.tableRepository = tableRepository;
        this.zoneRepository = zoneRepository;
        this.cocktailRepository = cocktailRepository;
        this.commandeRepository = commandeRepository;
        this.factureRepository = factureRepository;
        this.employeeShiftRepository = employeeShiftRepository;
        this.passwordEncoder = passwordEncoder;
        this.timeService = timeService;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    @Transactional
    public void seedDemoDataIfEmpty() {
        if (commandeRepository.count() > 0) {
            log.info("Database already contains orders, skipping demo dataset seeding.");
            return;
        }

        log.info("Starting complete demo dataset seeding from JSON asset '{}'...", DATASET_PATH);
        seedAllDemoData();
        log.info("Demo dataset seeding successfully finished.");
    }

    @Transactional
    public void seedAllDemoData() {
        InputStream is = loadResourceStream();
        if (is == null) {
            log.warn("Demo dataset JSON file '{}' not found in classpath.", DATASET_PATH);
            return;
        }

        try (InputStream stream = is) {
            JsonNode root = objectMapper.readTree(stream);

            Map<String, User> usersMap = seedUsersFromJson(root.get("users"));
            seedZonesFromJson(root.get("zones"));
            Map<Integer, TableEntity> tablesMap = seedTablesFromJson(root.get("tables"), usersMap);
            seedShiftsFromJson(root.get("shifts"), usersMap);

            List<Cocktail> cocktails = cocktailRepository.findAll();
            if (cocktails.isEmpty()) {
                log.warn("No cocktails found during demo seeding. Create cocktails first.");
                return;
            }

            seedOrdersFromJson(root.get("orders"), usersMap, tablesMap, cocktails);
            seedInvoicesFromJson(root.get("invoices"), tablesMap);

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
            String password = uNode.get("password").asText();
            String nom = uNode.get("nom").asText();
            String prenom = uNode.get("prenom").asText();

            Set<UserRole> roles = new HashSet<>();
            if (uNode.has("roles") && uNode.get("roles").isArray()) {
                for (JsonNode rNode : uNode.get("roles")) {
                    roles.add(UserRole.valueOf(rNode.asText()));
                }
            }

            User user = userRepository.findByUsername(username).orElseGet(() -> {
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

    private void seedZonesFromJson(JsonNode zonesNode) {
        if (zonesNode == null || !zonesNode.isArray()) return;

        for (JsonNode zNode : zonesNode) {
            String nom = zNode.get("nom").asText();
            String etage = zNode.get("etage").asText();

            zoneRepository.findByNom(nom).orElseGet(() -> {
                ZoneEntity z = new ZoneEntity();
                z.setNom(nom);
                z.setEtage(etage);
                z.setCreatedAt(timeService.now());
                z.setUpdatedAt(timeService.now());
                return zoneRepository.save(z);
            });
        }
    }

    private Map<Integer, TableEntity> seedTablesFromJson(JsonNode tablesNode, Map<String, User> usersMap) {
        Map<Integer, TableEntity> tablesMap = new HashMap<>();
        if (tablesNode == null || !tablesNode.isArray()) return tablesMap;

        for (JsonNode tNode : tablesNode) {
            int numero = tNode.get("numero").asInt();
            String zone = tNode.get("zone").asText();
            int capacite = tNode.get("capacite").asInt();
            boolean occupee = tNode.get("occupee").asBoolean();
            String serveurUsername = tNode.hasNonNull("serveurUsername") ? tNode.get("serveurUsername").asText() : null;
            Double planX = tNode.get("planX").asDouble();
            Double planY = tNode.get("planY").asDouble();
            String planForme = tNode.get("planForme").asText();

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

            if (occupee) {
                t.setDateOccupation(timeService.now().minusMinutes(25));
            } else {
                t.setDateOccupation(null);
                t.setDateLiberation(timeService.now().minusMinutes(45));
            }

            tablesMap.put(numero, tableRepository.save(t));
        }
        return tablesMap;
    }

    private void seedShiftsFromJson(JsonNode shiftsNode, Map<String, User> usersMap) {
        if (shiftsNode == null || !shiftsNode.isArray()) return;
        LocalDate today = LocalDate.now();

        for (JsonNode sNode : shiftsNode) {
            String username = sNode.get("username").asText();
            User user = usersMap.get(username);
            if (user == null) continue;

            TypeShift shiftType = TypeShift.valueOf(sNode.get("shiftType").asText());
            TypePoste poste = TypePoste.valueOf(sNode.get("poste").asText());
            String heureDebut = sNode.get("heureDebut").asText();
            String heureFin = sNode.get("heureFin").asText();

            boolean exists = employeeShiftRepository.findByUserId(user.getId()).stream()
                    .anyMatch(s -> s.getDateShift().equals(today) && s.getTypeShift() == shiftType);

            if (!exists) {
                EmployeeShift shift = new EmployeeShift();
                shift.setUser(user);
                shift.setDateShift(today);
                shift.setTypeShift(shiftType);
                shift.setTypePoste(poste);
                shift.setHeureDebut(heureDebut);
                shift.setHeureFin(heureFin);
                shift.setHeuresEffectuees(new BigDecimal("8.00"));
                shift.setNotes("Créneau JSON auto-généré");
                employeeShiftRepository.save(shift);
            }
        }
    }

    private void seedOrdersFromJson(JsonNode ordersNode, Map<String, User> usersMap, Map<Integer, TableEntity> tablesMap, List<Cocktail> cocktails) {
        if (ordersNode == null || !ordersNode.isArray()) return;
        LocalDateTime now = timeService.now();

        for (JsonNode oNode : ordersNode) {
            int tableNumero = oNode.get("tableNumero").asInt();
            String serveurUsername = oNode.get("serveurUsername").asText();
            CommandeStatut statut = CommandeStatut.valueOf(oNode.get("statut").asText());
            int minutesAgo = oNode.get("minutesAgo").asInt();
            String notes = oNode.hasNonNull("notes") ? oNode.get("notes").asText() : null;

            TableEntity table = tablesMap.get(tableNumero);
            User serveur = usersMap.get(serveurUsername);
            LocalDateTime orderTime = now.minusMinutes(minutesAgo);

            List<Cocktail> orderCocktails = new ArrayList<>();
            if (oNode.has("items") && oNode.get("items").isArray()) {
                for (JsonNode itemNode : oNode.get("items")) {
                    String cocktailName = itemNode.get("cocktailName").asText();
                    int quantite = itemNode.has("quantite") ? itemNode.get("quantite").asInt() : 1;
                    Cocktail c = findCocktailByName(cocktails, cocktailName);
                    for (int i = 0; i < quantite; i++) {
                        orderCocktails.add(c);
                    }
                }
            }

            Commande cmd = new Commande();
            cmd.setTable(table);
            cmd.setServeur(serveur);
            cmd.setStatut(statut);
            cmd.setDateCommande(orderTime);
            cmd.setTrackingToken("TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            cmd.setNotes(notes);

            BigDecimal total = BigDecimal.ZERO;
            List<CommandeItem> items = new ArrayList<>();

            for (Cocktail c : orderCocktails) {
                CommandeItem item = new CommandeItem();
                item.setCommande(cmd);
                item.setCocktail(c);
                item.setQuantite(1);
                item.setPrixUnitaire(c.getPrix() != null ? c.getPrix() : new BigDecimal("9.50"));
                items.add(item);
                total = total.add(item.getPrixUnitaire());
            }

            cmd.setItems(items);
            cmd.setTotal(total);

            if (statut == CommandeStatut.EN_PREPARATION) {
                cmd.setDatePreparation(orderTime.plusMinutes(2));
            } else if (statut == CommandeStatut.PRET) {
                cmd.setDatePreparation(orderTime.plusMinutes(2));
                cmd.setDateLivraison(orderTime.plusMinutes(5));
            } else if (statut == CommandeStatut.REGLEE) {
                cmd.setDateReglement(orderTime.plusMinutes(35));
            }

            commandeRepository.save(cmd);
        }
    }

    private void seedInvoicesFromJson(JsonNode invoicesNode, Map<Integer, TableEntity> tablesMap) {
        if (invoicesNode == null || !invoicesNode.isArray()) return;
        LocalDateTime now = timeService.now();

        for (JsonNode invNode : invoicesNode) {
            String numero = invNode.get("numero").asText();
            int tableNumero = invNode.get("tableNumero").asInt();
            boolean reglee = invNode.get("reglee").asBoolean();
            String modePaiement = invNode.hasNonNull("modePaiement") ? invNode.get("modePaiement").asText() : null;
            BigDecimal pourboire = invNode.has("pourboire") ? new BigDecimal(invNode.get("pourboire").asText()) : BigDecimal.ZERO;
            int minutesAgo = invNode.get("minutesAgo").asInt();
            String notes = invNode.hasNonNull("notes") ? invNode.get("notes").asText() : null;

            TableEntity table = tablesMap.get(tableNumero);
            LocalDateTime invoiceTime = now.minusMinutes(minutesAgo);

            BigDecimal total = BigDecimal.ZERO;
            List<FactureItem> items = new ArrayList<>();

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

            if (invNode.has("items") && invNode.get("items").isArray()) {
                for (JsonNode itemNode : invNode.get("items")) {
                    String description = itemNode.get("description").asText();
                    int quantite = itemNode.get("quantite").asInt();
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
            f.setTotal(total);
            f.setTotalHT(total.multiply(new BigDecimal("0.8333")));
            f.setTotalVAT(total.multiply(new BigDecimal("0.1667")));
            f.setTotalTTC(total);

            factureRepository.save(f);
        }
    }

    private Cocktail findCocktailByName(List<Cocktail> cocktails, String name) {
        return cocktails.stream()
                .filter(c -> c.getNom().equalsIgnoreCase(name))
                .findFirst()
                .orElse(cocktails.get(0));
    }
}
