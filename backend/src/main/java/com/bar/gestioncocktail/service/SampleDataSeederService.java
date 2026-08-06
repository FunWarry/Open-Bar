package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service responsible for automatically seeding a rich, complete demonstration dataset
 * (Users, Zones, Tables, Shifts, Active Orders, Overdue Orders, Paid & Pending Invoices)
 * on application startup in 'dev' and 'test' profiles.
 */
@Service
@Profile({"dev", "test"})
public class SampleDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(SampleDataSeederService.class);

    private final UserRepository userRepository;
    private final TableRepository tableRepository;
    private final ZoneRepository zoneRepository;
    private final CocktailRepository cocktailRepository;
    private final CommandeRepository commandeRepository;
    private final FactureRepository factureRepository;
    private final EmployeeShiftRepository employeeShiftRepository;
    private final PasswordEncoder passwordEncoder;
    private final TimeService timeService;

    public SampleDataSeederService(
            UserRepository userRepository,
            TableRepository tableRepository,
            ZoneRepository zoneRepository,
            CocktailRepository cocktailRepository,
            CommandeRepository commandeRepository,
            FactureRepository factureRepository,
            EmployeeShiftRepository employeeShiftRepository,
            PasswordEncoder passwordEncoder,
            TimeService timeService) {
        this.userRepository = userRepository;
        this.tableRepository = tableRepository;
        this.zoneRepository = zoneRepository;
        this.cocktailRepository = cocktailRepository;
        this.commandeRepository = commandeRepository;
        this.factureRepository = factureRepository;
        this.employeeShiftRepository = employeeShiftRepository;
        this.passwordEncoder = passwordEncoder;
        this.timeService = timeService;
    }

    @PostConstruct
    @Transactional
    public void seedDemoDataIfEmpty() {
        if (commandeRepository.count() > 0) {
            log.info("Database already contains orders, skipping demo dataset seeding.");
            return;
        }

        log.info("Starting complete demo dataset seeding for OpenBar...");
        seedAllDemoData();
        log.info("Demo dataset seeding successfully finished.");
    }

    @Transactional
    public void seedAllDemoData() {
        Map<String, User> users = seedUsers();
        Map<Integer, TableEntity> tables = seedZonesAndTables(users);
        seedEmployeeShifts(users);

        List<Cocktail> cocktails = cocktailRepository.findAll();
        if (cocktails.isEmpty()) {
            log.warn("No cocktails found during demo seeding. Create cocktails first.");
            return;
        }

        seedOrdersAndInvoices(users, tables, cocktails);
    }

    private Map<String, User> seedUsers() {
        Map<String, User> users = new HashMap<>();

        User admin = findOrCreateUser("admin", "admin@openbar.fr", "admin123", "Dupont", "Alexandre", Set.of(UserRole.ADMIN, UserRole.MANAGER));
        User manager = findOrCreateUser("manager", "manager@openbar.fr", "manager123", "Martin", "Sophie", Set.of(UserRole.MANAGER));
        User serveur1 = findOrCreateUser("serveur1", "lucas@openbar.fr", "serveur123", "Bernard", "Lucas", Set.of(UserRole.SERVEUR));
        User serveur2 = findOrCreateUser("serveur2", "camille@openbar.fr", "serveur123", "Dubois", "Camille", Set.of(UserRole.SERVEUR));
        User barman1 = findOrCreateUser("barman1", "antoine@openbar.fr", "barman123", "Moreau", "Antoine", Set.of(UserRole.BARMAN));
        User barman2 = findOrCreateUser("barman2", "emma@openbar.fr", "barman123", "Laurent", "Emma", Set.of(UserRole.BARMAN));

        users.put("admin", admin);
        users.put("manager", manager);
        users.put("serveur1", serveur1);
        users.put("serveur2", serveur2);
        users.put("barman1", barman1);
        users.put("barman2", barman2);

        return users;
    }

    private User findOrCreateUser(String username, String email, String password, String nom, String prenom, Set<UserRole> roles) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setNom(nom);
            user.setPrenom(prenom);
            user.setRoles(roles);
            user.setCreatedAt(timeService.now());
            user.setUpdatedAt(timeService.now());
            return userRepository.save(user);
        });
    }

    private Map<Integer, TableEntity> seedZonesAndTables(Map<String, User> users) {
        findOrCreateZone("Salle Principale", "RDC");
        findOrCreateZone("Terrasse", "RDC");
        findOrCreateZone("Mezzanine", "1er Étage");

        Map<Integer, TableEntity> tables = new HashMap<>();

        // Salle Principale
        tables.put(1, createOrUpdateTable(1, "Salle Principale", 2, false, null, 100.0, 100.0, "CARRE"));
        tables.put(2, createOrUpdateTable(2, "Salle Principale", 4, true, users.get("serveur1"), 250.0, 100.0, "CARRE"));
        tables.put(3, createOrUpdateTable(3, "Salle Principale", 4, true, users.get("serveur2"), 400.0, 100.0, "RONDE"));
        tables.put(4, createOrUpdateTable(4, "Salle Principale", 6, true, users.get("serveur1"), 550.0, 100.0, "RECTANGLE"));
        tables.put(5, createOrUpdateTable(5, "Salle Principale", 2, false, null, 100.0, 250.0, "CARRE"));
        tables.put(6, createOrUpdateTable(6, "Salle Principale", 8, true, users.get("serveur1"), 300.0, 250.0, "RECTANGLE"));

        // Terrasse
        tables.put(10, createOrUpdateTable(10, "Terrasse", 4, true, users.get("serveur2"), 100.0, 400.0, "RONDE"));
        tables.put(11, createOrUpdateTable(11, "Terrasse", 2, false, null, 250.0, 400.0, "CARRE"));
        tables.put(12, createOrUpdateTable(12, "Terrasse", 4, true, users.get("serveur2"), 400.0, 400.0, "RONDE"));
        tables.put(13, createOrUpdateTable(13, "Terrasse", 6, false, null, 550.0, 400.0, "RECTANGLE"));

        // Mezzanine
        tables.put(20, createOrUpdateTable(20, "Mezzanine", 4, true, users.get("serveur1"), 100.0, 550.0, "CARRE"));
        tables.put(21, createOrUpdateTable(21, "Mezzanine", 2, false, null, 250.0, 550.0, "CARRE"));
        tables.put(22, createOrUpdateTable(22, "Mezzanine", 6, false, null, 400.0, 550.0, "RECTANGLE"));

        return tables;
    }

    private ZoneEntity findOrCreateZone(String nom, String etage) {
        return zoneRepository.findByNom(nom).orElseGet(() -> {
            ZoneEntity z = new ZoneEntity();
            z.setNom(nom);
            z.setEtage(etage);
            z.setCreatedAt(timeService.now());
            z.setUpdatedAt(timeService.now());
            return zoneRepository.save(z);
        });
    }

    private TableEntity createOrUpdateTable(int numero, String zone, int capacite, boolean occupee, User serveur, Double x, Double y, String forme) {
        TableEntity t = tableRepository.findByNumero(numero).orElseGet(() -> {
            TableEntity table = new TableEntity();
            table.setNumero(numero);
            return table;
        });

        t.setZone(zone);
        t.setCapacite(capacite);
        t.setOccupee(occupee);
        t.setServeurId(serveur != null ? serveur.getId() : null);
        t.setPlanX(x);
        t.setPlanY(y);
        t.setPlanForme(forme);

        if (occupee) {
            t.setDateOccupation(timeService.now().minusMinutes(25));
        } else {
            t.setDateOccupation(null);
            t.setDateLiberation(timeService.now().minusMinutes(45));
        }

        return tableRepository.save(t);
    }

    private void seedEmployeeShifts(Map<String, User> users) {
        LocalDate today = LocalDate.now();

        createShiftIfMissing(users.get("serveur1"), today, TypeShift.MATIN, TypePoste.SERVEUR, "10:00", "18:00");
        createShiftIfMissing(users.get("serveur2"), today, TypeShift.SOIR, TypePoste.SERVEUR, "17:00", "01:00");
        createShiftIfMissing(users.get("barman1"), today, TypeShift.SOIR, TypePoste.BARMAN, "16:00", "02:00");
        createShiftIfMissing(users.get("barman2"), today, TypeShift.MATIN, TypePoste.BARMAN, "11:00", "17:00");
    }

    private void createShiftIfMissing(User user, LocalDate date, TypeShift shiftType, TypePoste poste, String debut, String fin) {
        if (user == null) return;
        boolean exists = employeeShiftRepository.findByUserId(user.getId()).stream()
                .anyMatch(s -> s.getDateShift().equals(date) && s.getTypeShift() == shiftType);

        if (!exists) {
            EmployeeShift shift = new EmployeeShift();
            shift.setUser(user);
            shift.setDateShift(date);
            shift.setTypeShift(shiftType);
            shift.setTypePoste(poste);
            shift.setHeureDebut(debut);
            shift.setHeureFin(fin);
            shift.setHeuresEffectuees(new BigDecimal("8.00"));
            shift.setNotes("Créneau planning auto-généré");
            employeeShiftRepository.save(shift);
        }
    }

    private void seedOrdersAndInvoices(Map<String, User> users, Map<Integer, TableEntity> tables, List<Cocktail> cocktails) {
        LocalDateTime now = timeService.now();

        Cocktail mojito = findCocktailByName(cocktails, "Mojito");
        Cocktail spritz = findCocktailByName(cocktails, "Aperol Spritz");
        Cocktail pinaColada = findCocktailByName(cocktails, "Piña Colada");
        Cocktail margarita = findCocktailByName(cocktails, "Margarita");
        Cocktail negroni = findCocktailByName(cocktails, "Negroni");
        Cocktail ginTonic = findCocktailByName(cocktails, "Gin Tonic");
        Cocktail caipirinha = findCocktailByName(cocktails, "Caïpirinha");
        Cocktail espressoMartini = findCocktailByName(cocktails, "Espresso Martini");

        // 1. Paid & Completed Historic Orders + Invoices
        createCompletedOrderAndInvoice(tables.get(1), users.get("serveur1"), List.of(mojito, pinaColada), now.minusHours(2), "FAC-2026-00001", "CARTE_BANCAIRE", BigDecimal.ZERO);
        createCompletedOrderAndInvoice(tables.get(5), users.get("serveur2"), List.of(spritz, espressoMartini, spritz), now.minusHours(3), "FAC-2026-00002", "ESPECES", new BigDecimal("3.00"));
        createCompletedOrderAndInvoice(tables.get(11), users.get("serveur1"), List.of(margarita, mojito), now.minusHours(4), "FAC-2026-00003", "CARTE_BANCAIRE", BigDecimal.ZERO);
        createCompletedOrderAndInvoice(tables.get(21), users.get("serveur2"), List.of(caipirinha, caipirinha, negroni), now.minusHours(5), "FAC-2026-00004", "CONTREMARQUE", BigDecimal.ZERO);
        createCompletedOrderAndInvoice(tables.get(13), users.get("serveur1"), List.of(ginTonic, negroni, mojito), now.minusHours(6), "FAC-2026-00005", "CARTE_BANCAIRE", new BigDecimal("2.50"));

        // 2. Active Orders in EN_PREPARATION
        createOrder(tables.get(2), users.get("serveur1"), CommandeStatut.EN_PREPARATION, List.of(mojito, mojito, negroni), now.minusMinutes(4), "Sans glaçons sur 1 Mojito");
        createOrder(tables.get(10), users.get("serveur2"), CommandeStatut.EN_PREPARATION, List.of(margarita, spritz, ginTonic), now.minusMinutes(2), null);

        // 3. Active Order PRET (Ready to serve)
        createOrder(tables.get(4), users.get("serveur1"), CommandeStatut.PRET, List.of(espressoMartini, pinaColada, mojito), now.minusMinutes(7), "Servir vite");

        // 4. Active Order EN_ATTENTE (Recent, 1 min ago)
        createOrder(tables.get(3), users.get("serveur2"), CommandeStatut.EN_ATTENTE, List.of(spritz, spritz), now.minusMinutes(1), null);

        // 5. OVERDUE ORDERS (EN_RETARD: >5m WARN and >10m DANGER/CRITICAL thresholds)
        createOrder(tables.get(6), users.get("serveur1"), CommandeStatut.EN_ATTENTE, List.of(mojito, mojito, mojito, pinaColada, margarita), now.minusMinutes(18), "[ALERTE RETARD 18M] Table VIP 6");
        createOrder(tables.get(12), users.get("serveur2"), CommandeStatut.EN_ATTENTE, List.of(negroni, espressoMartini, caipirinha, caipirinha), now.minusMinutes(28), "[ALERTE CRITIQUE RETARD 28M] Terrasse Table 12");

        // 6. Pending Invoices (Unsettled / En Attente)
        createPendingInvoice(tables.get(2), List.of(mojito, mojito, negroni), now.minusMinutes(10), "FAC-2026-00006");
        createPendingInvoice(tables.get(4), List.of(espressoMartini, pinaColada, mojito), now.minusMinutes(15), "FAC-2026-00007");
        createPendingInvoice(tables.get(10), List.of(margarita, spritz, ginTonic), now.minusMinutes(20), "FAC-2026-00008");
    }

    private Cocktail findCocktailByName(List<Cocktail> cocktails, String name) {
        return cocktails.stream()
                .filter(c -> c.getNom().equalsIgnoreCase(name))
                .findFirst()
                .orElse(cocktails.get(0));
    }

    private Commande createOrder(TableEntity table, User serveur, CommandeStatut statut, List<Cocktail> cocktailList, LocalDateTime orderTime, String notes) {
        Commande cmd = new Commande();
        cmd.setTable(table);
        cmd.setServeur(serveur);
        cmd.setStatut(statut);
        cmd.setDateCommande(orderTime);
        cmd.setTrackingToken("TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cmd.setNotes(notes);

        BigDecimal total = BigDecimal.ZERO;
        List<CommandeItem> items = new ArrayList<>();

        for (Cocktail c : cocktailList) {
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
        }

        return commandeRepository.save(cmd);
    }

    private void createCompletedOrderAndInvoice(TableEntity table, User serveur, List<Cocktail> cocktailList, LocalDateTime orderTime, String invoiceNum, String paymentMode, BigDecimal pourboire) {
        Commande cmd = createOrder(table, serveur, CommandeStatut.REGLEE, cocktailList, orderTime, "Commande réglée");
        cmd.setDateReglement(orderTime.plusMinutes(35));
        commandeRepository.save(cmd);

        Facture f = new Facture();
        f.setTable(table);
        f.setNumero(invoiceNum);
        f.setTotal(cmd.getTotal());
        f.setTotalHT(cmd.getTotal().multiply(new BigDecimal("0.8333")));
        f.setTotalVAT(cmd.getTotal().multiply(new BigDecimal("0.1667")));
        f.setTotalTTC(cmd.getTotal());
        f.setPourboire(pourboire);
        f.setReglee(true);
        f.setModePaiement(paymentMode);
        f.setDateFacture(orderTime);
        f.setDateReglement(orderTime.plusMinutes(35));
        f.setFinalized(true);
        f.setFinalizedAt(orderTime.plusMinutes(35));
        f.setNotes("Facture acquittée " + paymentMode);

        List<FactureItem> items = new ArrayList<>();
        for (CommandeItem ci : cmd.getItems()) {
            FactureItem fi = new FactureItem();
            fi.setFacture(f);
            fi.setCommandeItem(ci);
            fi.setDescription(ci.getCocktail().getNom());
            fi.setQuantite(ci.getQuantite());
            fi.setPrixUnitaire(ci.getPrixUnitaire());
            fi.setTotal(ci.getPrixUnitaire().multiply(BigDecimal.valueOf(ci.getQuantite())));
            items.add(fi);
        }

        f.setItems(items);
        factureRepository.save(f);
    }

    private void createPendingInvoice(TableEntity table, List<Cocktail> cocktailList, LocalDateTime invoiceTime, String invoiceNum) {
        BigDecimal total = BigDecimal.ZERO;
        List<FactureItem> items = new ArrayList<>();

        Facture f = new Facture();
        f.setTable(table);
        f.setNumero(invoiceNum);
        f.setReglee(false);
        f.setDateFacture(invoiceTime);
        f.setNotes("En attente de règlement par la table N°" + table.getNumero());

        for (Cocktail c : cocktailList) {
            BigDecimal price = c.getPrix() != null ? c.getPrix() : new BigDecimal("9.50");
            FactureItem fi = new FactureItem();
            fi.setFacture(f);
            fi.setDescription(c.getNom());
            fi.setQuantite(1);
            fi.setPrixUnitaire(price);
            fi.setTotal(price);
            items.add(fi);
            total = total.add(price);
        }

        f.setItems(items);
        f.setTotal(total);
        f.setTotalHT(total.multiply(new BigDecimal("0.8333")));
        f.setTotalVAT(total.multiply(new BigDecimal("0.1667")));
        f.setTotalTTC(total);
        factureRepository.save(f);
    }
}
