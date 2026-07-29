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
import com.bar.gestioncocktail.repository.TableRepository;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
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

import java.security.MessageDigest;
import java.time.Year;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional
public class FactureService {
    private static final String NOT_FOUND_ID_PREFIX = "Facture non trouvée avec l'id: ";
    private static final String NOT_FOUND_PREFIX = "Facture non trouvée: ";

    private final FactureRepository factureRepository;
    private final TableRepository tableRepository;
    private final EntityManager entityManager;
    private final AuditLogService auditLogService;
    private final AvoirCreditRepository avoirCreditRepository;

    @Autowired
    public FactureService(FactureRepository factureRepository, TableRepository tableRepository,
            EntityManager entityManager, AuditLogService auditLogService, AvoirCreditRepository avoirCreditRepository) {
        this.factureRepository = factureRepository;
        this.tableRepository = tableRepository;
        this.entityManager = entityManager;
        this.auditLogService = auditLogService;
        this.avoirCreditRepository = avoirCreditRepository;
    }

    public List<Facture> getAllFactures() {
        return factureRepository.findAll();
    }

    public Optional<Facture> getFactureById(Long id) {
        return factureRepository.findById(id);
    }

    public List<Facture> getFacturesByTable(TableEntity table) {
        return factureRepository.findByTable(table);
    }

    public List<Facture> getFacturesByDate(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateFactureBetween(debut, fin);
    }

    @Transactional
    public Facture createFacture(Facture facture) {
        facture.setDateFacture(LocalDateTime.now(ZoneId.systemDefault()));
        int currentYear = Year.now(ZoneId.systemDefault()).getValue();

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
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + id));

        facture.setReglee(true);
        facture.setModePaiement(modePaiement);
        facture.setDateReglement(LocalDateTime.now(ZoneId.systemDefault()));

        if (facture.getTable() != null) {
            TableEntity table = facture.getTable();
            table.setOccupee(false);
            tableRepository.save(table);
        }

        return factureRepository.save(facture);
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
        facture.setUpdatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        factureRepository.save(facture);
    }

    /**
     * Split égal : divise le total TTC (ou total si pas de pourboire) en N parts
     * égales.
     * Ne crée pas de sous-factures — retourne uniquement le calcul.
     */
    public List<SplitResultDTO> splitEgal(Long factureId, int nombreConvives) {
        if (nombreConvives < 2 || nombreConvives > 20) {
            throw new IllegalArgumentException("Le nombre de convives doit être compris entre 2 et 20");
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
                    "Convive " + i,
                    List.of(),
                    partParPersonne,
                    partParPersonne));
        }
        return result;
    }

    /**
     * Split par sélection d'articles : chaque convive indique les itemIds qu'il
     * prend en charge.
     * Vérifie que chaque itemId appartient bien à la facture.
     */
    public List<SplitResultDTO> splitParSelection(Long factureId, SplitAdditionRequest request) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PREFIX + factureId));

        // Index des items de la facture par id pour lookup O(1)
        Map<Long, FactureItem> itemsIndex = new HashMap<>();
        if (facture.getItems() != null) {
            for (FactureItem item : facture.getItems()) {
                itemsIndex.put(item.getId(), item);
            }
        }

        List<SplitResultDTO> result = new ArrayList<>();

        for (com.bar.gestioncocktail.dto.SplitPartRequest part : request.parts()) {
            List<SplitResultDTO.SplitItemDTO> splitItems = new ArrayList<>();
            BigDecimal sousTotal = BigDecimal.ZERO;

            for (Long itemId : part.itemIds()) {
                FactureItem item = itemsIndex.get(itemId);
                if (item == null) {
                    throw new IllegalArgumentException(
                            "L'item " + itemId + " n'appartient pas à la facture " + factureId);
                }
                splitItems.add(new SplitResultDTO.SplitItemDTO(
                        item.getId(),
                        item.getDescription(),
                        item.getQuantite(),
                        item.getPrixUnitaire(),
                        item.getTotal()));
                sousTotal = sousTotal.add(item.getTotal());
            }

            result.add(new SplitResultDTO(
                    factureId,
                    part.nomConvive(),
                    splitItems,
                    sousTotal,
                    sousTotal));
        }

        return result;
    }

    @Transactional
    public Facture fusionnerFactures(MergeFacturesRequestDTO request) {
        List<Facture> factures = factureRepository.findAllById(request.factureIds());
        validateFacturesPourFusion(factures);

        TableEntity tableCible = request.targetTableId() != null
                ? tableRepository.findById(request.targetTableId()).orElse(factures.get(0).getTable())
                : factures.get(0).getTable();

        Facture merged = new Facture();
        merged.setTable(tableCible);
        long sequence = ((Number) entityManager.createNativeQuery("SELECT NEXTVAL('facture_seq')").getSingleResult())
                .longValue();
        String mois = LocalDateTime.now(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("yyyyMM"));
        merged.setNumero(String.format("FAC-MERGE-%s-%04d", mois, sequence));
        merged.setDateFacture(LocalDateTime.now(ZoneId.systemDefault()));
        merged.setReglee(false);

        BigDecimal total = BigDecimal.ZERO;
        List<FactureItem> newItems = new ArrayList<>();

        for (Facture f : factures) {
            total = total.add(copierItemsEtMarquerFacture(f, merged, newItems));
        }

        merged.setItems(newItems);
        merged.setTotal(total);
        merged.setTotalTTC(total);

        Facture saved = factureRepository.save(merged);

        auditLogService.logAction(null, "FUSION_FACTURES", "Facture", saved.getId(),
                "Fusion de " + factures.size() + " factures en " + saved.getNumero(), null);

        return saved;
    }

    /**
     * Validates that a list of invoices can be merged.
     *
     * @param factures the list of invoices to validate
     */
    private void validateFacturesPourFusion(List<Facture> factures) {
        if (factures.size() < 2) {
            throw new BusinessException("Au moins 2 factures valides sont requises pour la fusion.");
        }
        for (Facture f : factures) {
            if (f.isReglee()) {
                throw new BusinessException(
                        "La facture " + f.getNumero() + " est déjà réglée et ne peut pas être fusionnée.");
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
    private BigDecimal copierItemsEtMarquerFacture(Facture f, Facture merged, List<FactureItem> newItems) {
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
        f.setModePaiement("FUSIONNE");
        f.setNotes("Fusionnée dans la facture " + merged.getNumero());
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
            throw new BusinessException("La facture " + facture.getNumero() + " est déjà finalisée et immuable.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
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

        int currentYear = Year.now(ZoneId.systemDefault()).getValue();
        long countAvoirs = avoirCreditRepository.count() + 1;
        String numeroAvoir = String.format("AV-%d-%05d", currentYear, countAvoirs);

        AvoirCredit avoir = new AvoirCredit();
        avoir.setNumero(numeroAvoir);
        avoir.setFacture(facture);
        avoir.setTotalHT(facture.getTotalHT() != null ? facture.getTotalHT() : BigDecimal.ZERO);
        avoir.setTotalVAT(facture.getTotalVAT() != null ? facture.getTotalVAT() : BigDecimal.ZERO);
        avoir.setTotalTTC(facture.getTotalTTC() != null ? facture.getTotalTTC() : facture.getTotal());
        avoir.setMotif(motif != null ? motif : "Annulation de la facture " + facture.getNumero());

        AvoirCredit savedAvoir = avoirCreditRepository.save(avoir);

        facture.setNotes("Annulée par l'avoir " + numeroAvoir + (motif != null ? " (" + motif + ")" : ""));
        factureRepository.save(facture);

        auditLogService.logAction(null, "CREATION_AVOIR", "AvoirCredit", savedAvoir.getId(),
                "Avoir " + numeroAvoir + " créé pour la facture " + facture.getNumero(), null);

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
            result.put("reason", "Aucun hash ou document PDF disponible pour vérification");
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
            throw new RuntimeException("Erreur de calcul du hash SHA-256", e);
        }
    }
}