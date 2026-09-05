package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.MergeFacturesRequestDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.FactureReglementRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.event.InvoiceSettledEvent;
import com.bar.gestioncocktail.event.OrderStatusChangedEvent;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import jakarta.persistence.EntityManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.bar.gestioncocktail.model.AvoirCredit;
import com.bar.gestioncocktail.model.VatRate;
import com.bar.gestioncocktail.dto.VatSummaryDTO;
import com.bar.gestioncocktail.dto.VatMonthlySummaryDTO;
import com.bar.gestioncocktail.repository.AvoirCreditRepository;

import com.bar.gestioncocktail.dto.EncaissementRequestDTO;
import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.dto.TableAdditionItemDTO;
import com.bar.gestioncocktail.dto.TableAdditionResponseDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.UserRepository;

import java.security.MessageDigest;
import java.time.Year;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

/**
 * Business service managing billing, invoice issuance, VAT multi-rate calculations,
 * bill splitting, table checkout, credit notes, and accounting exports.
 */
@Service
@Transactional
public class FactureService {
    private static final String NOT_FOUND_ID_PREFIX = "Invoice not found with id: ";
    private static final String NOT_FOUND_PREFIX = "Invoice not found: ";
    private static final String ENTITY_FACTURE = "Invoice";

    private final FactureRepository factureRepository;
    private final TableRepository tableRepository;
    private final CommandeRepository commandeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final AuditLogService auditLogService;
    private final AvoirCreditRepository avoirCreditRepository;
    private final TimeService timeService;
    private final FactureReglementRepository factureReglementRepository;

    public FactureService(FactureRepository factureRepository, TableRepository tableRepository,
            CommandeRepository commandeRepository, ApplicationEventPublisher eventPublisher,
            UserRepository userRepository, EntityManager entityManager, AuditLogService auditLogService,
            AvoirCreditRepository avoirCreditRepository, TimeService timeService,
            FactureReglementRepository factureReglementRepository) {
        this.factureRepository = factureRepository;
        this.tableRepository = tableRepository;
        this.commandeRepository = commandeRepository;
        this.eventPublisher = eventPublisher;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
        this.auditLogService = auditLogService;
        this.avoirCreditRepository = avoirCreditRepository;
        this.timeService = timeService;
        this.factureReglementRepository = factureReglementRepository;
    }

    public List<Facture> getAllFactures() {
        return factureRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Facture> getFactureById(Long id) {
        return factureRepository.findById(id).map(f -> {
            if (f.getReglements() != null) {
                org.hibernate.Hibernate.initialize(f.getReglements());
            }
            return f;
        });
    }

    public List<Facture> getFacturesByTable(TableEntity table) {
        return factureRepository.findByTable(table);
    }

    public List<Facture> getFacturesByDate(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateFactureBetween(debut, fin);
    }

    @Transactional
    public Facture createFacture(Facture facture) {
        facture.setDateFacture(LocalDateTime.now(timeService.getZoneId()));
        int currentYear = Year.now(timeService.getZoneId()).getValue();

        // Sequentially format FAC-YYYY-NNNNN
        long countThisYear = factureRepository.count() + 1;
        facture.setNumero(String.format("FAC-%d-%05d", currentYear, countThisYear));

        // Calculate HT, VAT, and TTC for each item
        BigDecimal totalHT = BigDecimal.ZERO;
        BigDecimal totalVAT = BigDecimal.ZERO;
        BigDecimal totalTTC = BigDecimal.ZERO;

        if (facture.getItems() != null) {
            for (FactureItem item : facture.getItems()) {
                if (item.getVatRate() == null) {
                    item.setVatRate(VatRate.TWENTY);
                }
                BigDecimal qty = BigDecimal.valueOf(item.getQuantite());
                BigDecimal lineTTC = item.getPrixUnitaire().multiply(qty);
                item.setTotal(lineTTC);

                BigDecimal rate = item.getVatRate().getRate();
                BigDecimal lineHT = lineTTC.divide(BigDecimal.ONE.add(rate), 2, RoundingMode.HALF_UP);
                BigDecimal lineVAT = lineTTC.subtract(lineHT);

                item.setPriceHT(lineHT);
                item.setVatAmount(lineVAT);

                totalHT = totalHT.add(lineHT);
                totalVAT = totalVAT.add(lineVAT);
                totalTTC = totalTTC.add(lineTTC);
            }
        }

        facture.setTotalHT(totalHT);
        facture.setTotalVAT(totalVAT);
        facture.setTotal(totalTTC);
        facture.setTotalTTC(totalTTC);

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture updateFacture(Long id, Facture factureDetails) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + id));

        facture.setTable(factureDetails.getTable());
        facture.setItems(factureDetails.getItems());
        facture.setTotal(factureDetails.getTotal());
        facture.setReglee(factureDetails.isReglee());
        facture.setModePaiement(factureDetails.getModePaiement());

        return factureRepository.save(facture);
    }

    @Transactional
    public void deleteFacture(Long id) {
        factureRepository.deleteById(id);
    }

    @Transactional
    public Facture ajouterItem(Long factureId, FactureItem item) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + factureId));

        facture.getItems().add(item);
        facture.setTotal(
                facture.getTotal().add(item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite()))));

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture retirerItem(Long factureId, Long itemId) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + factureId));

        facture.getItems().removeIf(item -> item.getId().equals(itemId));

        BigDecimal total = BigDecimal.ZERO;
        for (FactureItem item : facture.getItems()) {
            if (item.getPrixUnitaire() != null) {
                total = total.add(item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite())));
            }
        }
        facture.setTotal(total);

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture reglerFacture(Long id, String modePaiement) {
        return executeReglerFacture(id, modePaiement, null);
    }

    @Transactional
    public Facture reglerFacture(Long id, String modePaiement, BigDecimal pourboire) {
        return executeReglerFacture(id, modePaiement, pourboire);
    }

    private Facture executeReglerFacture(Long id, String modePaiement, BigDecimal pourboire) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + id));

        if (pourboire != null && pourboire.compareTo(BigDecimal.ZERO) > 0) {
            facture.setPourboire(pourboire);
            BigDecimal currentTotal = facture.getTotal() != null ? facture.getTotal() : BigDecimal.ZERO;
            facture.setTotalTTC(currentTotal.add(pourboire));
        }

        facture.setReglee(true);
        facture.setModePaiement(modePaiement);
        facture.setDateReglement(LocalDateTime.now(timeService.getZoneId()));

        if (facture.getTable() != null) {
            TableEntity table = facture.getTable();
            table.setOccupee(false);
            table.setServeurId(null);
            table.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));
            tableRepository.save(table);
            if (eventPublisher != null) {
                eventPublisher.publishEvent(new TableLiberatedEvent(table));
            }
        }

        Facture saved = factureRepository.save(facture);
        auditLogService.logAction(null, "REGLEMENT_FACTURE", ENTITY_FACTURE, saved.getId(),
                "Payment settlement of invoice " + saved.getNumero() + " (" + modePaiement + ")", null);
        return saved;
    }

    /**
     * Computes the detailed bill summary for a given table based on its active and delivered orders.
     *
     * @param tableId Table identifier
     * @return TableAdditionResponseDTO containing aggregated items, tax breakdown, and totals
     */
    @Transactional(readOnly = true)
    public TableAdditionResponseDTO getTableAddition(Long tableId) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + tableId));

        List<Commande> allCommandes = commandeRepository.findByTable(table);
        List<Commande> activeCommandes = filterActiveOrders(allCommandes, null);

        List<Facture> facturesTable = factureRepository.findByTable(table);
        Optional<Facture> unpaidFacture = findUnpaidFacture(facturesTable);

        String serveurNom = resolveServeurName(table, activeCommandes);
        List<TableAdditionItemDTO> items = buildAdditionItemList(activeCommandes, unpaidFacture);

        BigDecimal totalHT = BigDecimal.ZERO;
        BigDecimal totalVAT = BigDecimal.ZERO;
        BigDecimal totalTTC = BigDecimal.ZERO;
        int totalArticles = 0;

        for (TableAdditionItemDTO item : items) {
            if (item.priceHT() != null) {
                totalHT = totalHT.add(item.priceHT());
            }
            if (item.vatAmount() != null) {
                totalVAT = totalVAT.add(item.vatAmount());
            }
            if (item.total() != null) {
                totalTTC = totalTTC.add(item.total());
            }
            totalArticles += item.quantite();
        }

        List<Long> commandeIds = new ArrayList<>();
        for (Commande c : activeCommandes) {
            if (c.getId() != null) {
                commandeIds.add(c.getId());
            }
        }

        return new TableAdditionResponseDTO(
                table.getId(),
                table.getNumero(),
                table.getZone(),
                table.getServeurId(),
                serveurNom,
                table.getDateOccupation(),
                items,
                commandeIds,
                totalHT,
                totalVAT,
                totalTTC,
                totalArticles,
                unpaidFacture.isPresent(),
                unpaidFacture.isPresent() ? unpaidFacture.get().getId() : null
        );
    }

    /**
     * Settles and closes a table's bill: generates or updates invoice, applies discounts/tips,
     * updates order statuses to REGLEE, releases the table, and broadcasts STOMP events.
     *
     * @param tableId Table identifier
     * @param request Encaissement request payload
     * @return FactureResponseDTO of the settled invoice
     */
    @Transactional
    public FactureResponseDTO encaisserTable(Long tableId, EncaissementRequestDTO request) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + tableId));

        List<Commande> allCommandes = commandeRepository.findByTable(table);
        List<Commande> activeCommandes = filterActiveOrders(allCommandes, request.commandeIds());

        List<Facture> facturesTable = factureRepository.findByTable(table);
        Optional<Facture> unpaidFacture = findUnpaidFacture(facturesTable);

        if (activeCommandes.isEmpty() && unpaidFacture.isEmpty()) {
            throw new BusinessException("No active orders to checkout for table " + table.getNumero());
        }

        Facture facture = unpaidFacture.orElseGet(() -> createNewFactureForTable(table, activeCommandes));
        computeAndSetInvoiceTaxTotals(facture);
        BigDecimal netTTC = applyDiscountAndTip(facture, request);

        facture.setReglee(true);
        facture.setModePaiement(request.modePaiement());
        facture.setDateReglement(LocalDateTime.now(timeService.getZoneId()));
        if (request.notes() != null && !request.notes().isBlank()) {
            facture.setNotes(request.notes());
        }

        Facture savedFacture = factureRepository.save(facture);

        markOrdersAsSettled(activeCommandes);
        releaseTableIfRequested(table, request.shouldLibererTable());

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new InvoiceSettledEvent(savedFacture, table, activeCommandes, request.shouldLibererTable()));
        }

        auditLogService.logAction(null, "ENCAISSEMENT_TABLE", ENTITY_FACTURE, savedFacture.getId(),
                "Encaissement table " + table.getNumero() + " (" + request.modePaiement() + " - " + netTTC + " €)", null);

        return FactureResponseDTO.from(savedFacture);
    }

    private List<Commande> filterActiveOrders(List<Commande> allCommandes, List<Long> filterIds) {
        return allCommandes.stream()
                .filter(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE)
                .filter(c -> filterIds == null || filterIds.isEmpty() || filterIds.contains(c.getId()))
                .toList();
    }

    private Optional<Facture> findUnpaidFacture(List<Facture> facturesTable) {
        return facturesTable.stream()
                .filter(f -> !f.isReglee())
                .findFirst();
    }

    private List<TableAdditionItemDTO> buildAdditionItemList(List<Commande> activeCommandes, Optional<Facture> unpaidFacture) {
        List<TableAdditionItemDTO> items = new ArrayList<>();
        if (!activeCommandes.isEmpty()) {
            for (Commande cmd : activeCommandes) {
                if (cmd.getItems() != null) {
                    for (CommandeItem item : cmd.getItems()) {
                        items.add(buildAdditionItemDTO(item, cmd.getId()));
                    }
                }
            }
        } else if (unpaidFacture.isPresent() && unpaidFacture.get().getItems() != null) {
            for (FactureItem fi : unpaidFacture.get().getItems()) {
                items.add(buildAdditionItemDTOFromFactureItem(fi));
            }
        }
        return items;
    }

    private void computeAndSetInvoiceTaxTotals(Facture facture) {
        BigDecimal subTotalTTC = BigDecimal.ZERO;
        BigDecimal totalHT = BigDecimal.ZERO;
        BigDecimal totalVAT = BigDecimal.ZERO;

        if (facture.getItems() != null) {
            for (FactureItem fi : facture.getItems()) {
                if (fi.getTotal() != null) {
                    subTotalTTC = subTotalTTC.add(fi.getTotal());
                }
                if (fi.getPriceHT() != null) {
                    totalHT = totalHT.add(fi.getPriceHT());
                }
                if (fi.getVatAmount() != null) {
                    totalVAT = totalVAT.add(fi.getVatAmount());
                }
            }
        }

        facture.setTotal(subTotalTTC);
        facture.setTotalHT(totalHT);
        facture.setTotalVAT(totalVAT);
    }

    private BigDecimal applyDiscountAndTip(Facture facture, EncaissementRequestDTO request) {
        BigDecimal subTotalTTC = facture.getTotal() != null ? facture.getTotal() : BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;

        if (request.remiseMontant() != null && request.remiseMontant().compareTo(BigDecimal.ZERO) > 0) {
            discount = request.remiseMontant();
        } else if (request.remisePourcentage() != null && request.remisePourcentage().compareTo(BigDecimal.ZERO) > 0) {
            discount = subTotalTTC.multiply(request.remisePourcentage())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        BigDecimal netTTC = subTotalTTC.subtract(discount).max(BigDecimal.ZERO);

        if (request.pourboire() != null && request.pourboire().compareTo(BigDecimal.ZERO) > 0) {
            facture.setPourboire(request.pourboire());
            netTTC = netTTC.add(request.pourboire());
        }
        facture.setTotalTTC(netTTC);
        return netTTC;
    }

    private void markOrdersAsSettled(List<Commande> activeCommandes) {
        for (Commande cmd : activeCommandes) {
            CommandeStatut oldStatut = cmd.getStatut();
            cmd.setStatut(CommandeStatut.REGLEE);
            cmd.setDateReglement(LocalDateTime.now(timeService.getZoneId()));
            cmd.setUpdatedAt(timeService.now());
            commandeRepository.save(cmd);

            if (eventPublisher != null) {
                eventPublisher.publishEvent(new OrderStatusChangedEvent(cmd.getId(), oldStatut, CommandeStatut.REGLEE, cmd));
            }
        }
    }

    private void releaseTableIfRequested(TableEntity table, boolean shouldLiberer) {
        if (shouldLiberer && table != null) {
            table.setOccupee(false);
            table.setServeurId(null);
            table.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));
            tableRepository.save(table);
            if (eventPublisher != null) {
                eventPublisher.publishEvent(new TableLiberatedEvent(table));
            }
        }
    }

    private Facture createNewFactureForTable(TableEntity table, List<Commande> activeCommandes) {
        Facture facture = new Facture();
        facture.setTable(table);
        facture.setDateFacture(LocalDateTime.now(timeService.getZoneId()));

        int currentYear = Year.now(timeService.getZoneId()).getValue();
        long countThisYear = factureRepository.count() + 1;
        facture.setNumero(String.format("FAC-%d-%05d", currentYear, countThisYear));

        List<FactureItem> factureItems = new ArrayList<>();
        for (Commande cmd : activeCommandes) {
            if (cmd.getItems() != null) {
                for (CommandeItem ci : cmd.getItems()) {
                    factureItems.add(buildFactureItemFromCommandeItem(ci, facture));
                }
            }
        }
        facture.setItems(factureItems);
        return facture;
    }

    private FactureItem buildFactureItemFromCommandeItem(CommandeItem item, Facture facture) {
        FactureItem fi = new FactureItem();
        fi.setFacture(facture);
        fi.setCommandeItem(item);
        String desc = item.getCocktail() != null ? item.getCocktail().getNom() : "Article";
        if (item.getVariante() != null && item.getVariante().getNom() != null) {
            desc += " (" + item.getVariante().getNom() + ")";
        }
        fi.setDescription(desc);
        fi.setQuantite(item.getQuantite());
        BigDecimal unitPrice = item.getPrixUnitaire() != null ? item.getPrixUnitaire() : BigDecimal.ZERO;
        fi.setPrixUnitaire(unitPrice);

        BigDecimal lineTTC = unitPrice.multiply(BigDecimal.valueOf(item.getQuantite()));
        fi.setTotal(lineTTC);
        fi.setVatRate(VatRate.TWENTY);
        BigDecimal lineHT = lineTTC.divide(BigDecimal.valueOf(1.20), 2, RoundingMode.HALF_UP);
        fi.setPriceHT(lineHT);
        fi.setVatAmount(lineTTC.subtract(lineHT));
        return fi;
    }

    private TableAdditionItemDTO buildAdditionItemDTO(CommandeItem item, Long commandeId) {
        BigDecimal qty = BigDecimal.valueOf(item.getQuantite());
        BigDecimal unitPrice = item.getPrixUnitaire() != null ? item.getPrixUnitaire() : BigDecimal.ZERO;
        BigDecimal lineTTC = unitPrice.multiply(qty);
        BigDecimal lineHT = lineTTC.divide(BigDecimal.valueOf(1.20), 2, RoundingMode.HALF_UP);
        BigDecimal lineVAT = lineTTC.subtract(lineHT);
        String cocktailNom = item.getCocktail() != null ? item.getCocktail().getNom() : "Article";
        String varianteNom = item.getVariante() != null ? item.getVariante().getNom() : null;

        return new TableAdditionItemDTO(
                item.getId(),
                commandeId,
                item.getCocktail() != null ? item.getCocktail().getId() : null,
                cocktailNom,
                varianteNom,
                item.getQuantite(),
                unitPrice,
                lineTTC,
                lineHT,
                lineVAT,
                "20%"
        );
    }

    private TableAdditionItemDTO buildAdditionItemDTOFromFactureItem(FactureItem fi) {
        BigDecimal unitPrice = fi.getPrixUnitaire() != null ? fi.getPrixUnitaire() : BigDecimal.ZERO;
        BigDecimal lineTTC = fi.getTotal() != null ? fi.getTotal() : BigDecimal.ZERO;
        BigDecimal lineHT = fi.getPriceHT() != null ? fi.getPriceHT() : lineTTC.divide(BigDecimal.valueOf(1.20), 2, RoundingMode.HALF_UP);
        BigDecimal lineVAT = fi.getVatAmount() != null ? fi.getVatAmount() : lineTTC.subtract(lineHT);

        return new TableAdditionItemDTO(
                fi.getId(),
                fi.getCommandeItem() != null && fi.getCommandeItem().getCommande() != null ? fi.getCommandeItem().getCommande().getId() : null,
                fi.getCommandeItem() != null && fi.getCommandeItem().getCocktail() != null ? fi.getCommandeItem().getCocktail().getId() : null,
                fi.getDescription(),
                null,
                fi.getQuantite(),
                unitPrice,
                lineTTC,
                lineHT,
                lineVAT,
                fi.getVatRate() != null ? fi.getVatRate().getLabel() : "20%"
        );
    }

    private String resolveServeurName(TableEntity table, List<Commande> activeCommandes) {
        if (table.getServeurId() != null) {
            Optional<User> userOpt = userRepository.findById(table.getServeurId());
            if (userOpt.isPresent()) {
                User u = userOpt.get();
                return u.getPrenom() != null ? u.getPrenom() + " " + u.getNom() : u.getUsername();
            }
        }
        for (Commande c : activeCommandes) {
            if (c.getServeur() != null) {
                User u = c.getServeur();
                return u.getPrenom() != null ? u.getPrenom() + " " + u.getNom() : u.getUsername();
            }
        }
        return null;
    }

    public List<Facture> getFacturesReglees() {
        return factureRepository.findByReglee(true);
    }

    public List<Facture> getFacturesByDateEmission(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateFactureBetween(debut, fin);
    }

    public List<Facture> getFacturesByDateReglement(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateReglementBetween(debut, fin);
    }

    public List<Facture> getFacturesByModePaiement(String modePaiement) {
        return factureRepository.findByModePaiement(modePaiement);
    }

    public void ajouterPourboire(Facture facture, BigDecimal pourboire) {
        facture.setPourboire(pourboire);
        facture.setTotalTTC(facture.getTotal().add(pourboire));
        facture.setUpdatedAt(LocalDateTime.now(timeService.getZoneId()));
        factureRepository.save(facture);
    }

    /**
     * Equal split: divides the total TTC (or total without tip) into N equal parts.
     * Does not persist child invoices — returns calculated portions.
     */
    public List<SplitResultDTO> splitEgal(Long factureId, int nombreConvives) {
        if (nombreConvives < 2 || nombreConvives > 20) {
            throw new BusinessException("Number of guests must be between 2 and 20");
        }
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId));

        BigDecimal base = facture.getTotalTTC();
        if (base == null) {
            base = facture.getTotal() != null ? facture.getTotal() : BigDecimal.ZERO;
        }
        BigDecimal partParPersonne = base.divide(BigDecimal.valueOf(nombreConvives), 2, RoundingMode.HALF_UP);

        List<SplitResultDTO> result = new ArrayList<>();
        for (int i = 1; i <= nombreConvives; i++) {
            result.add(new SplitResultDTO(
                    factureId,
                    "Guest " + i,
                    List.of(),
                    partParPersonne,
                    partParPersonne));
        }
        return result;
    }

    /**
     * Itemized split: each guest selects the item IDs they are paying for.
     * Verifies that each itemId belongs to the invoice.
     */
    public List<SplitResultDTO> splitParSelection(Long factureId, SplitAdditionRequest request) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId));

        Map<Long, FactureItem> itemsIndex = buildInvoiceItemsIndex(facture);
        List<SplitResultDTO> result = new ArrayList<>();

        for (com.bar.gestioncocktail.dto.SplitPartRequest part : request.parts()) {
            result.add(createSplitResultForGuest(factureId, part, itemsIndex));
        }

        return result;
    }

    /**
     * Builds an index map of invoice items by ID for O(1) lookups.
     *
     * @param facture the invoice entity
     * @return map of item ID to FactureItem
     */
    private Map<Long, FactureItem> buildInvoiceItemsIndex(Facture facture) {
        Map<Long, FactureItem> itemsIndex = new HashMap<>();
        if (facture.getItems() != null) {
            for (FactureItem item : facture.getItems()) {
                itemsIndex.put(item.getId(), item);
            }
        }
        return itemsIndex;
    }

    /**
     * Creates a SplitResultDTO for a single guest part.
     *
     * @param factureId ID of the invoice
     * @param part the guest split request
     * @param itemsIndex lookup map of invoice items
     * @return populated SplitResultDTO for this guest
     */
    private SplitResultDTO createSplitResultForGuest(
            Long factureId,
            com.bar.gestioncocktail.dto.SplitPartRequest part,
            Map<Long, FactureItem> itemsIndex) {
        List<SplitResultDTO.SplitItemDTO> splitItems = new ArrayList<>();
        if (part.items() != null && !part.items().isEmpty()) {
            splitItems.addAll(buildItemsFromSelections(part.items(), itemsIndex, factureId));
        } else if (part.itemIds() != null) {
            splitItems.addAll(buildItemsFromLegacyIds(part.itemIds(), itemsIndex, factureId));
        }

        BigDecimal sousTotal = BigDecimal.ZERO;
        for (SplitResultDTO.SplitItemDTO item : splitItems) {
            sousTotal = sousTotal.add(item.total());
        }

        return new SplitResultDTO(factureId, part.nomConvive(), splitItems, sousTotal, sousTotal);
    }

    /**
     * Builds SplitItemDTO objects from granular quantity split selections.
     *
     * @param requests list of item selection requests with quantities
     * @param itemsIndex lookup map of invoice items
     * @param factureId invoice ID for error context
     * @return list of converted SplitItemDTO objects
     */
    private List<SplitResultDTO.SplitItemDTO> buildItemsFromSelections(
            List<com.bar.gestioncocktail.dto.SplitPartItemRequest> requests,
            Map<Long, FactureItem> itemsIndex,
            Long factureId) {
        List<SplitResultDTO.SplitItemDTO> items = new ArrayList<>();
        for (com.bar.gestioncocktail.dto.SplitPartItemRequest req : requests) {
            FactureItem item = itemsIndex.get(req.itemId());
            if (item == null) {
                throw new BusinessException("Item " + req.itemId() + " does not belong to invoice " + factureId);
            }
            int qte = (req.quantite() != null && req.quantite() > 0) ? req.quantite() : 1;
            BigDecimal lineTotal = item.getPrixUnitaire().multiply(BigDecimal.valueOf(qte));
            items.add(new SplitResultDTO.SplitItemDTO(item.getId(), item.getDescription(), qte, item.getPrixUnitaire(), lineTotal));
        }
        return items;
    }

    /**
     * Builds SplitItemDTO objects from legacy item ID lists.
     *
     * @param itemIds list of item IDs allocated in full
     * @param itemsIndex lookup map of invoice items
     * @param factureId invoice ID for error context
     * @return list of converted SplitItemDTO objects
     */
    private List<SplitResultDTO.SplitItemDTO> buildItemsFromLegacyIds(
            List<Long> itemIds,
            Map<Long, FactureItem> itemsIndex,
            Long factureId) {
        List<SplitResultDTO.SplitItemDTO> items = new ArrayList<>();
        for (Long itemId : itemIds) {
            FactureItem item = itemsIndex.get(itemId);
            if (item == null) {
                throw new BusinessException("Item " + itemId + " does not belong to invoice " + factureId);
            }
            items.add(new SplitResultDTO.SplitItemDTO(item.getId(), item.getDescription(), item.getQuantite(), item.getPrixUnitaire(), item.getTotal()));
        }
        return items;
    }

    /**
     * Records and persists an individual split settlement for an invoice.
     * If the sum of all settled parts covers the full invoice total, the invoice is marked as settled.
     *
     * @param factureId Target invoice ID
     * @param request   Settlement request details
     * @return Saved FactureReglementDTO
     */
    @Transactional
    public com.bar.gestioncocktail.dto.FactureReglementDTO encaisserPart(Long factureId, com.bar.gestioncocktail.dto.EncaisserPartRequest request) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId));

        com.bar.gestioncocktail.model.FactureReglement reglement = new com.bar.gestioncocktail.model.FactureReglement();
        reglement.setFacture(facture);
        reglement.setNomConvive(request.nomConvive());
        reglement.setPartIndex(request.partIndex());
        reglement.setTotalParts(request.totalParts());
        reglement.setMontant(request.montant());
        reglement.setPourboire(request.pourboire() != null ? request.pourboire() : BigDecimal.ZERO);
        reglement.setTotalRegle(request.totalRegle());
        reglement.setModePaiement(request.modePaiement());
        reglement.setTypeSplit(request.typeSplit());
        reglement.setDateReglement(timeService.now());

        if (request.items() != null && !request.items().isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                reglement.setItemsJson(mapper.writeValueAsString(request.items()));
            } catch (Exception _) {
                reglement.setItemsJson("[]");
            }
        } else {
            reglement.setItemsJson("[]");
        }

        com.bar.gestioncocktail.model.FactureReglement saved = factureReglementRepository.save(reglement);
        if (facture.getReglements() == null) {
            facture.setReglements(new ArrayList<>());
        }
        facture.getReglements().add(saved);

        List<com.bar.gestioncocktail.model.FactureReglement> allReglements = factureReglementRepository.findByFactureIdOrderByIdAsc(factureId);
        checkAndFinalizeSplitSettlement(facture, factureId, allReglements);

        return com.bar.gestioncocktail.dto.FactureReglementDTO.from(saved);
    }

    private void checkAndFinalizeSplitSettlement(Facture facture, Long factureId, List<com.bar.gestioncocktail.model.FactureReglement> allReglements) {
        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalTips = BigDecimal.ZERO;
        for (com.bar.gestioncocktail.model.FactureReglement r : allReglements) {
            if (r.getMontant() != null) {
                totalPaid = totalPaid.add(r.getMontant());
            }
            if (r.getPourboire() != null) {
                totalTips = totalTips.add(r.getPourboire());
            }
        }

        BigDecimal invoiceTarget = facture.getTotalTTC();
        if (invoiceTarget == null) {
            invoiceTarget = facture.getTotal() != null ? facture.getTotal() : BigDecimal.ZERO;
        }

        if (totalPaid.compareTo(invoiceTarget.subtract(new BigDecimal("0.05"))) >= 0) {
            facture.setReglee(true);
            facture.setModePaiement("MIXTE_SPLIT");
            facture.setPourboire(totalTips);
            facture.setTotalTTC(invoiceTarget.add(totalTips));
            facture.setDateReglement(timeService.now());
            factureRepository.save(facture);

            if (facture.getTable() != null) {
                TableEntity table = facture.getTable();
                table.setOccupee(false);
                table.setServeurId(null);
                table.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));
                tableRepository.save(table);
                if (eventPublisher != null) {
                    eventPublisher.publishEvent(new TableLiberatedEvent(table));
                }
            }
            auditLogService.logAction(null, "FACTURE_SETTLED_SPLIT", ENTITY_FACTURE, factureId,
                    "Invoice " + facture.getNumero() + " settled via split parts (" + allReglements.size() + " parts)", null);
        }
    }

    /**
     * Retrieves all persistent split settlements for an invoice.
     *
     * @param factureId Target invoice ID
     * @return List of split settlements
     */
    @Transactional(readOnly = true)
    public List<com.bar.gestioncocktail.dto.FactureReglementDTO> getReglementsByFactureId(Long factureId) {
        if (!factureRepository.existsById(factureId)) {
            throw new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId);
        }
        return factureReglementRepository.findByFactureIdOrderByIdAsc(factureId).stream()
                .map(com.bar.gestioncocktail.dto.FactureReglementDTO::from)
                .toList();
    }

    @Transactional
    public Facture fusionnerFactures(MergeFacturesRequestDTO request) {
        List<Facture> factures = factureRepository.findAllById(request.factureIds());
        validateInvoicesForMerge(factures);

        TableEntity targetTable = request.targetTableId() != null
                ? tableRepository.findById(request.targetTableId()).orElse(factures.get(0).getTable())
                : factures.get(0).getTable();

        Facture merged = new Facture();
        merged.setTable(targetTable);
        long sequence = ((Number) entityManager.createNativeQuery("SELECT NEXTVAL('facture_seq')").getSingleResult())
                .longValue();
        String month = LocalDateTime.now(timeService.getZoneId()).format(DateTimeFormatter.ofPattern("yyyyMM"));
        merged.setNumero(String.format("FAC-MERGE-%s-%04d", month, sequence));
        merged.setDateFacture(LocalDateTime.now(timeService.getZoneId()));
        merged.setReglee(false);

        BigDecimal total = BigDecimal.ZERO;
        List<FactureItem> newItems = new ArrayList<>();

        for (Facture f : factures) {
            total = total.add(copyItemsAndMarkInvoiceMerged(f, merged, newItems));
        }

        merged.setItems(newItems);
        merged.setTotal(total);
        merged.setTotalTTC(total);

        Facture saved = factureRepository.save(merged);

        auditLogService.logAction(null, "FUSION_FACTURES", ENTITY_FACTURE, saved.getId(),
                "Merged " + factures.size() + " invoices into " + saved.getNumero(), null);

        return saved;
    }

    /**
     * Validates that a list of invoices can be merged.
     *
     * @param factures the list of invoices to validate
     */
    private void validateInvoicesForMerge(List<Facture> factures) {
        if (factures.size() < 2) {
            throw new BusinessException("At least 2 valid invoices are required for merge.");
        }
        for (Facture f : factures) {
            if (f.isReglee()) {
                throw new BusinessException(
                        "Invoice " + f.getNumero() + " is already settled and cannot be merged.");
            }
        }
    }

    /**
     * Copies invoice items to a merged invoice and marks the source invoice as
     * merged.
     *
     * @param f        the source invoice
     * @param merged   the target merged invoice
     * @param newItems the cumulative list of merged items
     * @return total price accumulated from the source invoice
     */
    private BigDecimal copyItemsAndMarkInvoiceMerged(Facture f, Facture merged, List<FactureItem> newItems) {
        BigDecimal subTotal = BigDecimal.ZERO;
        if (f.getItems() != null) {
            for (FactureItem item : f.getItems()) {
                FactureItem newItem = new FactureItem();
                newItem.setFacture(merged);
                newItem.setCommandeItem(item.getCommandeItem());
                newItem.setQuantite(item.getQuantite());
                newItem.setPrixUnitaire(item.getPrixUnitaire());
                newItem.setTotal(item.getTotal());
                newItem.setDescription(item.getDescription());
                newItems.add(newItem);
                if (item.getTotal() != null) {
                    subTotal = subTotal.add(item.getTotal());
                } else if (item.getPrixUnitaire() != null) {
                    subTotal = subTotal.add(item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite())));
                }
            }
        }
        f.setReglee(true);
        f.setModePaiement("MERGED");
        f.setNotes("Merged into invoice " + merged.getNumero());
        factureRepository.save(f);
        return subTotal;
    }

    /**
     * Finalizes an invoice, computing SHA-256 PDF hash, setting retention for 10
     * years and blocking further modifications.
     */
    @Transactional
    public Facture finalizeFacture(Long id, byte[] pdfBytes) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + id));

        if (facture.isFinalized()) {
            throw new BusinessException("Invoice " + facture.getNumero() + " is already finalized and immutable.");
        }

        LocalDateTime now = LocalDateTime.now(timeService.getZoneId());
        facture.setFinalized(true);
        facture.setFinalizedAt(now);
        facture.setRetentionUntil(now.plusYears(10));

        if (pdfBytes != null && pdfBytes.length > 0) {
            String hash = computeSHA256(pdfBytes);
            facture.setPdfHash(hash);
            facture.setArchivedPdfPath("/archives/factures/" + now.getYear() + "/"
                    + String.format("%02d", now.getMonthValue()) + "/" + facture.getNumero() + ".pdf");
        }

        return factureRepository.save(facture);
    }

    /**
     * Cancels an invoice by creating an official legal credit note (avoir).
     */
    @Transactional
    public AvoirCredit annulerFactureWithAvoir(Long factureId, String motif) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId));

        int currentYear = Year.now(timeService.getZoneId()).getValue();
        long countAvoirs = avoirCreditRepository.count() + 1;
        String numeroAvoir = String.format("AV-%d-%05d", currentYear, countAvoirs);

        AvoirCredit avoir = new AvoirCredit();
        avoir.setNumero(numeroAvoir);
        avoir.setFacture(facture);
        avoir.setTotalHT(facture.getTotalHT() != null ? facture.getTotalHT() : BigDecimal.ZERO);
        avoir.setTotalVAT(facture.getTotalVAT() != null ? facture.getTotalVAT() : BigDecimal.ZERO);
        avoir.setTotalTTC(facture.getTotalTTC() != null ? facture.getTotalTTC() : facture.getTotal());
        avoir.setMotif(motif != null ? motif : "Cancellation of invoice " + facture.getNumero());

        AvoirCredit savedAvoir = avoirCreditRepository.save(avoir);

        facture.setNotes("Cancelled by credit note " + numeroAvoir + (motif != null ? " (" + motif + ")" : ""));
        factureRepository.save(facture);

        auditLogService.logAction(null, "CREATION_AVOIR", "AvoirCredit", savedAvoir.getId(),
                "Credit note " + numeroAvoir + " created for invoice " + facture.getNumero(), null);

        return savedAvoir;
    }

    /**
     * Verifies the integrity of a stored archived PDF invoice against its stored
     * SHA-256 hash.
     */
    public Map<String, Object> verifyIntegrity(Long factureId, byte[] currentPdfBytes) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId));

        Map<String, Object> result = new HashMap<>();
        result.put("invoiceId", factureId);
        result.put("invoiceNumber", facture.getNumero());
        result.put("isFinalized", facture.isFinalized());
        result.put("storedHash", facture.getPdfHash());

        if (facture.getPdfHash() == null || currentPdfBytes == null) {
            result.put("valid", false);
            result.put("reason", "No hash or PDF document available for verification");
            return result;
        }

        String computedHash = computeSHA256(currentPdfBytes);
        result.put("computedHash", computedHash);
        boolean isValid = facture.getPdfHash().equalsIgnoreCase(computedHash);
        result.put("valid", isValid);

        return result;
    }

    /**
     * Generates UTF-8 BOM CSV data for accounting exports.
     */
    public String exportCSV(LocalDateTime dateFrom, LocalDateTime dateTo) {
        List<Facture> list = (dateFrom != null && dateTo != null)
                ? factureRepository.findByDateFactureBetween(dateFrom, dateTo)
                : factureRepository.findAll();

        StringBuilder sb = new StringBuilder();
        // Add UTF-8 BOM
        sb.append('\uFEFF');
        sb.append("N° Facture;Date;Table;Total HT;TVA 20%;TVA 10%;TVA 5.5%;Total TVA;Total TTC;Mode Paiement;Statut\n");

        for (Facture f : list) {
            sb.append(formatFactureCsvRow(f));
        }

        return sb.toString();
    }

    /**
     * Formats a single invoice row for CSV export.
     *
     * @param f the invoice to format
     * @return formatted CSV row string
     */
    private String formatFactureCsvRow(Facture f) {
        BigDecimal[] vats = calculateVatAmountsForExport(f.getItems());
        String dateStr = f.getDateFacture() != null
                ? f.getDateFacture().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                : "";
        String tableNum = f.getTable() != null ? String.valueOf(f.getTable().getNumero()) : "N/A";
        String statut = f.isReglee() ? "REGLEE" : "EN_ATTENTE";

        return String.format("%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s%n",
                f.getNumero(),
                dateStr,
                tableNum,
                f.getTotalHT() != null ? f.getTotalHT().toString() : "0.00",
                vats[0].toString(),
                vats[1].toString(),
                vats[2].toString(),
                f.getTotalVAT() != null ? f.getTotalVAT().toString() : "0.00",
                f.getTotalTTC() != null ? f.getTotalTTC().toString() : f.getTotal().toString(),
                f.getModePaiement() != null ? f.getModePaiement() : "",
                statut);
    }

    /**
     * Calculates VAT totals per rate for CSV export.
     *
     * @param items the list of invoice items
     * @return array containing cumulative VAT for 20%, 10%, and 5.5%
     */
    private BigDecimal[] calculateVatAmountsForExport(List<FactureItem> items) {
        BigDecimal vat20 = BigDecimal.ZERO;
        BigDecimal vat10 = BigDecimal.ZERO;
        BigDecimal vat55 = BigDecimal.ZERO;

        if (items != null) {
            for (FactureItem item : items) {
                if (item.getVatRate() != null && item.getVatAmount() != null) {
                    switch (item.getVatRate()) {
                        case TWENTY -> vat20 = vat20.add(item.getVatAmount());
                        case TEN -> vat10 = vat10.add(item.getVatAmount());
                        case FIVE_FIVE -> vat55 = vat55.add(item.getVatAmount());
                    }
                }
            }
        }
        return new BigDecimal[] { vat20, vat10, vat55 };
    }

    /**
     * Generates a monthly VAT summary for French CA3 tax declarations.
     */
    public VatMonthlySummaryDTO getVatMonthlySummary(String monthStr) {
        // monthStr format: YYYY-MM
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime start = LocalDateTime.parse(monthStr + "-01 00:00:00", formatter);
        LocalDateTime end = start.plusMonths(1).minusSeconds(1);

        List<Facture> factures = factureRepository.findByDateFactureBetween(start, end);

        BigDecimal grandTotalHT = BigDecimal.ZERO;
        BigDecimal grandTotalVAT = BigDecimal.ZERO;
        BigDecimal grandTotalTTC = BigDecimal.ZERO;

        Map<VatRate, BigDecimal> baseHTMap = new EnumMap<>(VatRate.class);
        Map<VatRate, BigDecimal> vatAmountMap = new EnumMap<>(VatRate.class);
        Map<VatRate, BigDecimal> totalTTCMap = new EnumMap<>(VatRate.class);

        for (VatRate rate : VatRate.values()) {
            baseHTMap.put(rate, BigDecimal.ZERO);
            vatAmountMap.put(rate, BigDecimal.ZERO);
            totalTTCMap.put(rate, BigDecimal.ZERO);
        }

        for (Facture f : factures) {
            if (f.getItems() != null) {
                BigDecimal[] totals = processFactureItemsForVat(f.getItems(), baseHTMap, vatAmountMap, totalTTCMap);
                grandTotalHT = grandTotalHT.add(totals[0]);
                grandTotalVAT = grandTotalVAT.add(totals[1]);
                grandTotalTTC = grandTotalTTC.add(totals[2]);
            }
        }

        Map<String, VatSummaryDTO> summaryMap = new HashMap<>();
        for (VatRate rate : VatRate.values()) {
            summaryMap.put(rate.name(), new VatSummaryDTO(
                    rate,
                    rate.getLabel(),
                    baseHTMap.get(rate),
                    vatAmountMap.get(rate),
                    totalTTCMap.get(rate)));
        }

        return new VatMonthlySummaryDTO(monthStr, grandTotalHT, summaryMap, grandTotalVAT, grandTotalTTC);
    }

    /**
     * Helper to accumulate VAT totals for a list of invoice items.
     *
     * @param items        the list of invoice items
     * @param baseHTMap    map accumulating base HT per rate
     * @param vatAmountMap map accumulating VAT amount per rate
     * @param totalTTCMap  map accumulating total TTC per rate
     * @return array containing cumulative totalHT, totalVAT, and totalTTC for the
     *         given items
     */
    private BigDecimal[] processFactureItemsForVat(List<FactureItem> items,
            Map<VatRate, BigDecimal> baseHTMap,
            Map<VatRate, BigDecimal> vatAmountMap,
            Map<VatRate, BigDecimal> totalTTCMap) {
        BigDecimal totalHT = BigDecimal.ZERO;
        BigDecimal totalVAT = BigDecimal.ZERO;
        BigDecimal totalTTC = BigDecimal.ZERO;

        for (FactureItem item : items) {
            VatRate r = item.getVatRate() != null ? item.getVatRate() : VatRate.TWENTY;
            BigDecimal itemHT = item.getPriceHT() != null ? item.getPriceHT() : BigDecimal.ZERO;
            BigDecimal itemVat = item.getVatAmount() != null ? item.getVatAmount() : BigDecimal.ZERO;
            BigDecimal itemTTC = item.getTotal() != null ? item.getTotal() : BigDecimal.ZERO;

            baseHTMap.put(r, baseHTMap.get(r).add(itemHT));
            vatAmountMap.put(r, vatAmountMap.get(r).add(itemVat));
            totalTTCMap.put(r, totalTTCMap.get(r).add(itemTTC));

            totalHT = totalHT.add(itemHT);
            totalVAT = totalVAT.add(itemVat);
            totalTTC = totalTTC.add(itemTTC);
        }
        return new BigDecimal[] { totalHT, totalVAT, totalTTC };
    }

    private static String computeSHA256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Erreur de calcul du hash SHA-256", e);
        }
    }

    /**
     * Calculates the financial daily closing summary report (Z-Report) for a given date.
     *
     * @param targetDate The target date to summarize (defaults to today if null)
     * @return DailyRecapDTO containing KPIs, payment method breakdown, and VAT breakdown
     */
    public com.bar.gestioncocktail.dto.DailyRecapDTO getDailyRecap(java.time.LocalDate targetDate) {
        java.time.LocalDate date = targetDate != null ? targetDate : java.time.LocalDate.now(timeService.getZoneId());
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59);

        List<Facture> facturesDuJour = findSettledFacturesForDate(startOfDay, endOfDay);

        BigDecimal totalCaTtc = BigDecimal.ZERO;
        BigDecimal totalCaHt = BigDecimal.ZERO;
        BigDecimal totalTva = BigDecimal.ZERO;
        int countReglees = 0;
        int totalClients = 0;

        Map<String, BigDecimal> modeTotals = new HashMap<>();
        Map<String, Long> modeCounts = new HashMap<>();

        Map<VatRate, BigDecimal> baseHTMap = new EnumMap<>(VatRate.class);
        Map<VatRate, BigDecimal> vatAmountMap = new EnumMap<>(VatRate.class);
        Map<VatRate, BigDecimal> totalTTCMap = new EnumMap<>(VatRate.class);

        initVatMaps(baseHTMap, vatAmountMap, totalTTCMap);

        for (Facture f : facturesDuJour) {
            BigDecimal ttc = resolveFactureTTC(f);
            BigDecimal ht = f.getTotalHT() != null ? f.getTotalHT() : BigDecimal.ZERO;
            BigDecimal tva = f.getTotalVAT() != null ? f.getTotalVAT() : BigDecimal.ZERO;

            totalCaTtc = totalCaTtc.add(ttc);
            totalCaHt = totalCaHt.add(ht);
            totalTva = totalTva.add(tva);
            countReglees++;

            if (f.getTable() != null && f.getTable().getCapacite() != null) {
                totalClients += f.getTable().getCapacite();
            }

            String mode = (f.getModePaiement() != null && !f.getModePaiement().isBlank()) ? f.getModePaiement() : "AUTRE";
            modeTotals.put(mode, modeTotals.getOrDefault(mode, BigDecimal.ZERO).add(ttc));
            modeCounts.put(mode, modeCounts.getOrDefault(mode, 0L) + 1);

            if (f.getItems() != null) {
                processFactureItemsForVat(f.getItems(), baseHTMap, vatAmountMap, totalTTCMap);
            }
        }

        BigDecimal panierMoyen = countReglees > 0
            ? totalCaTtc.divide(BigDecimal.valueOf(countReglees), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        List<com.bar.gestioncocktail.dto.PaymentModeSummaryDTO> modeSummaries = buildPaymentModeSummaries(modeTotals, modeCounts);
        List<VatSummaryDTO> vatSummaries = buildVatSummaries(baseHTMap, vatAmountMap, totalTTCMap);

        return new com.bar.gestioncocktail.dto.DailyRecapDTO(
            date,
            totalCaTtc,
            totalCaHt,
            totalTva,
            countReglees,
            panierMoyen,
            totalClients,
            modeSummaries,
            vatSummaries
        );
    }

    private void initVatMaps(Map<VatRate, BigDecimal> baseHTMap,
                             Map<VatRate, BigDecimal> vatAmountMap,
                             Map<VatRate, BigDecimal> totalTTCMap) {
        for (VatRate rate : VatRate.values()) {
            baseHTMap.put(rate, BigDecimal.ZERO);
            vatAmountMap.put(rate, BigDecimal.ZERO);
            totalTTCMap.put(rate, BigDecimal.ZERO);
        }
    }

    private List<com.bar.gestioncocktail.dto.PaymentModeSummaryDTO> buildPaymentModeSummaries(
            Map<String, BigDecimal> modeTotals, Map<String, Long> modeCounts) {
        List<com.bar.gestioncocktail.dto.PaymentModeSummaryDTO> list = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : modeTotals.entrySet()) {
            list.add(new com.bar.gestioncocktail.dto.PaymentModeSummaryDTO(
                entry.getKey(),
                modeCounts.get(entry.getKey()),
                entry.getValue()
            ));
        }
        return list;
    }

    private List<VatSummaryDTO> buildVatSummaries(Map<VatRate, BigDecimal> baseHTMap,
                                                  Map<VatRate, BigDecimal> vatAmountMap,
                                                  Map<VatRate, BigDecimal> totalTTCMap) {
        List<VatSummaryDTO> list = new ArrayList<>();
        for (VatRate rate : VatRate.values()) {
            list.add(new VatSummaryDTO(
                rate.getLabel(),
                baseHTMap.get(rate),
                vatAmountMap.get(rate),
                totalTTCMap.get(rate)
            ));
        }
        return list;
    }

    private BigDecimal resolveFactureTTC(Facture f) {
        if (f.getTotalTTC() != null) {
            return f.getTotalTTC();
        }
        return f.getTotal() != null ? f.getTotal() : BigDecimal.ZERO;
    }

    private List<Facture> findSettledFacturesForDate(LocalDateTime startOfDay, LocalDateTime endOfDay) {
        List<Facture> factures = factureRepository.findByDateReglementBetween(startOfDay, endOfDay);
        if (factures != null && !factures.isEmpty()) {
            return factures;
        }
        return factureRepository.findByDateFactureBetween(startOfDay, endOfDay)
                .stream()
                .filter(f -> f != null && f.isReglee())
                .toList();
    }
}