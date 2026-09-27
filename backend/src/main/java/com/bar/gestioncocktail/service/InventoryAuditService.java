package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.BatchUpdateItemCountsDTO;
import com.bar.gestioncocktail.dto.CreateInventoryAuditSessionDTO;
import com.bar.gestioncocktail.dto.InventoryAuditItemResponseDTO;
import com.bar.gestioncocktail.dto.InventoryAuditSessionResponseDTO;
import com.bar.gestioncocktail.dto.InventoryVarianceSummaryDTO;
import com.bar.gestioncocktail.dto.UpdateInventoryAuditItemCountDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.InventoryAuditItem;
import com.bar.gestioncocktail.model.InventoryAuditLocationCount;
import com.bar.gestioncocktail.model.InventoryAuditSession;
import com.bar.gestioncocktail.model.InventoryAuditStatus;
import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.model.StockWasteReason;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.InventoryAuditItemRepository;
import com.bar.gestioncocktail.repository.InventoryAuditLocationCountRepository;
import com.bar.gestioncocktail.repository.InventoryAuditSessionRepository;
import com.bar.gestioncocktail.repository.StockMovementRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Service managing the lifecycle of periodic physical inventory audits, counting sheets,
 * theoretical vs physical variance analysis, shrinkage reporting, and stock balance reconciliation.
 */
@Service
@Transactional
public class InventoryAuditService {

    private static final DateTimeFormatter REF_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter CSV_DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final InventoryAuditSessionRepository sessionRepository;
    private final InventoryAuditItemRepository itemRepository;
    private final InventoryAuditLocationCountRepository locationCountRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientService ingredientService;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final AuditLogService auditLogService;
    private final TimeService timeService;
    private final PdfService pdfService;

    /**
     * Constructs the inventory audit service with all business dependencies.
     *
     * @param sessionRepository JPA repository for audit sessions
     * @param itemRepository JPA repository for audit line items
     * @param locationCountRepository JPA repository for location counts
     * @param ingredientRepository JPA repository for ingredients
     * @param ingredientService Service for updating active ingredient stock balances
     * @param stockMovementRepository JPA repository for stock waste and adjustment movements
     * @param userRepository JPA repository for user lookup
     * @param establishmentConfigService Service for checking module capability flags
     * @param auditLogService Service for logging audit trail events
     * @param timeService Service for deterministic timestamping
     * @param pdfService Service for OpenPDF document generation
     */
    public InventoryAuditService(
            InventoryAuditSessionRepository sessionRepository,
            InventoryAuditItemRepository itemRepository,
            InventoryAuditLocationCountRepository locationCountRepository,
            IngredientRepository ingredientRepository,
            IngredientService ingredientService,
            StockMovementRepository stockMovementRepository,
            UserRepository userRepository,
            EstablishmentConfigService establishmentConfigService,
            AuditLogService auditLogService,
            TimeService timeService,
            PdfService pdfService) {
        this.sessionRepository = sessionRepository;
        this.itemRepository = itemRepository;
        this.locationCountRepository = locationCountRepository;
        this.ingredientRepository = ingredientRepository;
        this.ingredientService = ingredientService;
        this.stockMovementRepository = stockMovementRepository;
        this.userRepository = userRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.auditLogService = auditLogService;
        this.timeService = timeService;
        this.pdfService = pdfService;
    }

    /**
     * Creates and initializes a new physical inventory audit session in DRAFT state,
     * taking an immediate snapshot of current theoretical stock balances for all target ingredients.
     *
     * @param request The audit creation parameters
     * @param username The username of the manager initiating the audit
     * @return Transformed session response DTO
     */
    public InventoryAuditSessionResponseDTO createSession(CreateInventoryAuditSessionDTO request, String username) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        if (request == null) {
            throw new BusinessException("Inventory audit creation payload cannot be null");
        }

        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;
        String refCode = generateReferenceCode();

        InventoryAuditSession session = new InventoryAuditSession();
        session.setReferenceCode(refCode);
        session.setTitle(request.title().trim());
        session.setStatus(InventoryAuditStatus.DRAFT);
        session.setStorageLocationScope(request.storageLocationScope() != null && !request.storageLocationScope().isBlank()
                ? request.storageLocationScope().trim()
                : "ALL");
        session.setCategoryScope(request.categoryScope() != null && !request.categoryScope().isBlank()
                ? request.categoryScope().trim()
                : null);
        session.setNotes(request.notes());
        session.setCreatedBy(user);
        session.setCreatedAt(timeService.now());

        List<Ingredient> ingredients = ingredientRepository.findAll();
        List<InventoryAuditItem> items = new ArrayList<>();

        for (Ingredient ing : ingredients) {
            if (session.getCategoryScope() != null && !session.getCategoryScope().equalsIgnoreCase("ALL")
                    && !session.getCategoryScope().equalsIgnoreCase(ing.getCategory())) {
                continue;
            }

            InventoryAuditItem item = buildSnapshotItem(session, ing);
            items.add(item);
        }

        session.setItems(items);
        session.recalculateTotals();

        InventoryAuditSession saved = sessionRepository.save(session);
        return InventoryAuditSessionResponseDTO.from(saved);
    }

    private InventoryAuditItem buildSnapshotItem(InventoryAuditSession session, Ingredient ing) {
        InventoryAuditItem item = new InventoryAuditItem();
        item.setSession(session);
        item.setIngredient(ing);
        BigDecimal currentStock = ing.getQuantiteStock() != null ? ing.getQuantiteStock() : BigDecimal.ZERO;
        item.setTheoreticalQuantity(currentStock);

        BigDecimal unitCost = ing.getPrixUnitaire() != null ? ing.getPrixUnitaire() : BigDecimal.ZERO;
        item.setUnitCostHt(unitCost);

        BigDecimal theoVal = currentStock.multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
        item.setTheoreticalValueHt(theoVal);
        item.setCountedQuantity(null);
        item.setVarianceQuantity(BigDecimal.ZERO);
        item.setCountedValueHt(BigDecimal.ZERO);
        item.setVarianceValueHt(BigDecimal.ZERO);
        return item;
    }

    /**
     * Transitions an inventory audit session from DRAFT to IN_PROGRESS.
     *
     * @param sessionId Identifier of the audit session
     * @param username Initiator username
     * @return Updated audit session response DTO
     */
    public InventoryAuditSessionResponseDTO startSession(Long sessionId, String username) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        if (session.getStatus() != InventoryAuditStatus.DRAFT) {
            throw new BusinessException("Only DRAFT inventory sessions can be started. Current status: " + session.getStatus());
        }

        session.setStatus(InventoryAuditStatus.IN_PROGRESS);
        session.setStartedAt(timeService.now());

        InventoryAuditSession saved = sessionRepository.save(session);
        return InventoryAuditSessionResponseDTO.from(saved);
    }

    /**
     * Updates physical count values for a specific audit line item at a designated storage location.
     *
     * @param sessionId Identifier of the audit session
     * @param itemId Identifier of the audited ingredient line item
     * @param request Count values payload
     * @param username Counter staff member username
     * @return Updated audit line item response DTO
     */
    public InventoryAuditItemResponseDTO updateItemCount(Long sessionId, Long itemId, UpdateInventoryAuditItemCountDTO request, String username) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        validateSessionNotLocked(session);

        InventoryAuditItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Audit item not found with ID: " + itemId));

        if (!item.getSession().getId().equals(sessionId)) {
            throw new BusinessException("Item " + itemId + " does not belong to session " + sessionId);
        }

        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;
        applyLocationCount(item, request.storageLocation(), request.fullContainersCount(), request.partialQuantity(), request.notes(), user);

        item.recalculateTotals();
        InventoryAuditItem savedItem = itemRepository.save(item);

        session.recalculateTotals();
        sessionRepository.save(session);

        return InventoryAuditItemResponseDTO.from(savedItem);
    }

    /**
     * Batch updates physical counts across multiple inventory sheet lines in a single transaction.
     *
     * @param sessionId Identifier of the audit session
     * @param request Batch count payload
     * @param username Staff member username
     * @return Updated audit session response DTO
     */
    public InventoryAuditSessionResponseDTO batchUpdateCounts(Long sessionId, BatchUpdateItemCountsDTO request, String username) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        validateSessionNotLocked(session);

        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;

        for (var entry : request.counts()) {
            applyBatchEntry(sessionId, entry, user);
        }

        session.recalculateTotals();
        InventoryAuditSession saved = sessionRepository.save(session);
        return InventoryAuditSessionResponseDTO.from(saved);
    }

    private void applyBatchEntry(Long sessionId, BatchUpdateItemCountsDTO.BatchItemCountEntryDTO entry, User user) {
        InventoryAuditItem item = itemRepository.findById(entry.auditItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Audit item not found with ID: " + entry.auditItemId()));

        if (!item.getSession().getId().equals(sessionId)) {
            throw new BusinessException("Item " + entry.auditItemId() + " does not belong to session " + sessionId);
        }

        applyLocationCount(item, entry.storageLocation(), entry.fullContainersCount(), entry.partialQuantity(), entry.notes(), user);
        item.recalculateTotals();
        itemRepository.save(item);
    }

    private void applyLocationCount(InventoryAuditItem item, String locationName, Integer fullContainers, BigDecimal partial, String notes, User user) {
        String location = locationName != null && !locationName.isBlank()
                ? locationName.trim()
                : "Main Bar";

        InventoryAuditLocationCount locCount = locationCountRepository
                .findByAuditItemIdAndStorageLocation(item.getId(), location)
                .orElseGet(() -> {
                    InventoryAuditLocationCount lc = new InventoryAuditLocationCount();
                    lc.setAuditItem(item);
                    lc.setStorageLocation(location);
                    return lc;
                });

        int fullCount = fullContainers != null ? fullContainers : 0;
        BigDecimal partialVal = partial != null ? partial : BigDecimal.ZERO;

        BigDecimal packagingCap = item.getIngredient() != null && item.getIngredient().getPackagingCapacity() != null
                ? item.getIngredient().getPackagingCapacity()
                : BigDecimal.ONE;

        BigDecimal totalLocationQty = computeCountedQuantity(fullCount, partialVal, packagingCap);

        locCount.setFullContainersCount(fullCount);
        locCount.setPartialQuantity(partialVal);
        locCount.setCountedQuantity(totalLocationQty);
        locCount.setNotes(notes);
        locCount.setCountedBy(user);
        locCount.setCountedAt(timeService.now());

        if (locCount.getId() == null) {
            item.getLocationCounts().add(locCount);
        }

        locationCountRepository.save(locCount);
    }

    private BigDecimal computeCountedQuantity(int fullContainers, BigDecimal partial, BigDecimal packagingCap) {
        if (packagingCap.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal fullVol = BigDecimal.valueOf(fullContainers).multiply(packagingCap);
            return fullVol.add(partial).setScale(3, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(fullContainers).add(partial).setScale(3, RoundingMode.HALF_UP);
    }

    /**
     * Finalizes an audit session, reconciles verified physical counts into active inventory,
     * logs compensating stock movements (shrinkage loss or surplus gain), and locks the audit.
     *
     * @param sessionId Identifier of the audit session to finalize
     * @param username Approver username
     * @param ipAddress Client IP address for audit trail
     * @return Finalized audit session response DTO
     */
    public InventoryAuditSessionResponseDTO finalizeSession(Long sessionId, String username, String ipAddress) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        if (session.getStatus() == InventoryAuditStatus.FINALIZED) {
            throw new BusinessException("Audit session is already finalized");
        }
        if (session.getStatus() == InventoryAuditStatus.CANCELLED) {
            throw new BusinessException("Cannot finalize a cancelled audit session");
        }

        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;

        for (InventoryAuditItem item : session.getItems()) {
            reconcileItemStock(item, session, user);
        }

        session.setStatus(InventoryAuditStatus.FINALIZED);
        session.setFinalizedAt(timeService.now());
        session.setFinalizedBy(user);
        session.recalculateTotals();

        InventoryAuditSession saved = sessionRepository.save(session);

        String details = String.format("Inventory audit %s finalized: net variance %s EUR across %d items",
                saved.getReferenceCode(), saved.getTotalVarianceValueHt(), saved.getItems().size());
        auditLogService.logAction(user, "INVENTORY_AUDIT_FINALIZED", "InventoryAuditSession", saved.getId(), details, ipAddress);

        return InventoryAuditSessionResponseDTO.from(saved);
    }

    private void reconcileItemStock(InventoryAuditItem item, InventoryAuditSession session, User user) {
        item.recalculateTotals();
        if (item.getCountedQuantity() == null || item.getIngredient() == null) {
            return;
        }

        Ingredient ingredient = item.getIngredient();
        BigDecimal currentStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock() : BigDecimal.ZERO;
        BigDecimal physicalCount = item.getCountedQuantity();
        BigDecimal variance = physicalCount.subtract(currentStock);

        if (variance.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        ingredientService.updateStock(ingredient, physicalCount);

        StockMovement movement = new StockMovement();
        movement.setIngredient(ingredient);
        movement.setUnit(ingredient.getUniteMesure());
        movement.setReportedBy(user);
        movement.setRecordedAt(timeService.now());

        if (variance.compareTo(BigDecimal.ZERO) < 0) {
            BigDecimal absVariance = variance.abs();
            movement.setQuantity(absVariance);
            movement.setReason(StockWasteReason.INVENTORY_ADJUSTMENT);
            BigDecimal unitCost = item.getUnitCostHt() != null ? item.getUnitCostHt() : BigDecimal.ZERO;
            BigDecimal cost = absVariance.multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
            movement.setCost(cost);
            movement.setNotes(String.format("Audit %s shrinkage: -%s %s (cost: %s EUR)",
                    session.getReferenceCode(), absVariance, ingredient.getUniteMesure(), cost));
        } else {
            movement.setQuantity(variance);
            movement.setReason(StockWasteReason.INVENTORY_SURPLUS);
            movement.setCost(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            movement.setNotes(String.format("Audit %s surplus: +%s %s",
                    session.getReferenceCode(), variance, ingredient.getUniteMesure()));
        }

        stockMovementRepository.save(movement);
    }

    /**
     * Cancels an audit session without adjusting active stock balances.
     *
     * @param sessionId Identifier of the audit session
     * @param username Canceller username
     * @return Updated audit session response DTO
     */
    public InventoryAuditSessionResponseDTO cancelSession(Long sessionId, String username) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        if (session.getStatus() == InventoryAuditStatus.FINALIZED) {
            throw new BusinessException("Cannot cancel an already finalized audit session");
        }

        session.setStatus(InventoryAuditStatus.CANCELLED);
        InventoryAuditSession saved = sessionRepository.save(session);
        return InventoryAuditSessionResponseDTO.from(saved);
    }

    /**
     * Retrieves all inventory audit sessions ordered chronologically descending.
     *
     * @return List of audit session summaries
     */
    @Transactional(readOnly = true)
    public List<InventoryAuditSessionResponseDTO> getAllSessions() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        return sessionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(InventoryAuditSessionResponseDTO::from)
                .toList();
    }

    /**
     * Retrieves a single inventory audit session by ID with all line items and location counts.
     *
     * @param sessionId Identifier of the audit session
     * @return Detailed audit session response DTO
     */
    @Transactional(readOnly = true)
    public InventoryAuditSessionResponseDTO getSessionById(Long sessionId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);
        return InventoryAuditSessionResponseDTO.from(session);
    }

    /**
     * Computes consolidated variance and shrinkage metrics for an audit session.
     *
     * @param sessionId Identifier of the audit session
     * @return Consolidated variance summary metrics DTO
     */
    @Transactional(readOnly = true)
    public InventoryVarianceSummaryDTO getVarianceSummary(Long sessionId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        BigDecimal shrinkageVal = BigDecimal.ZERO;
        BigDecimal surplusVal = BigDecimal.ZERO;
        int discrepancyCount = 0;

        Map<String, BigDecimal> categoryVariances = new LinkedHashMap<>();
        Map<String, BigDecimal> locationCountedValues = new LinkedHashMap<>();

        for (InventoryAuditItem item : session.getItems()) {
            if (item.getVarianceValueHt() != null) {
                if (item.getVarianceValueHt().compareTo(BigDecimal.ZERO) < 0) {
                    shrinkageVal = shrinkageVal.add(item.getVarianceValueHt().abs());
                    discrepancyCount++;
                } else if (item.getVarianceValueHt().compareTo(BigDecimal.ZERO) > 0) {
                    surplusVal = surplusVal.add(item.getVarianceValueHt());
                    discrepancyCount++;
                }

                accumulateCategoryVariance(categoryVariances, item);
            }

            accumulateLocationCounts(locationCountedValues, item);
        }

        return new InventoryVarianceSummaryDTO(
                session.getTotalTheoreticalValueHt(),
                session.getTotalCountedValueHt(),
                session.getTotalVarianceValueHt(),
                shrinkageVal.setScale(2, RoundingMode.HALF_UP),
                surplusVal.setScale(2, RoundingMode.HALF_UP),
                session.getItems().size(),
                discrepancyCount,
                categoryVariances,
                locationCountedValues
        );
    }

    private void accumulateCategoryVariance(Map<String, BigDecimal> categoryVariances, InventoryAuditItem item) {
        String cat = item.getIngredient() != null ? item.getIngredient().getCategory() : "other";
        BigDecimal currentCatVar = categoryVariances.getOrDefault(cat, BigDecimal.ZERO);
        categoryVariances.put(cat, currentCatVar.add(item.getVarianceValueHt()));
    }

    private void accumulateLocationCounts(Map<String, BigDecimal> locationCountedValues, InventoryAuditItem item) {
        if (item.getLocationCounts() == null) {
            return;
        }
        for (InventoryAuditLocationCount lc : item.getLocationCounts()) {
            String loc = lc.getStorageLocation();
            BigDecimal qty = lc.getCountedQuantity() != null ? lc.getCountedQuantity() : BigDecimal.ZERO;
            BigDecimal cost = item.getUnitCostHt() != null ? item.getUnitCostHt() : BigDecimal.ZERO;
            BigDecimal locVal = qty.multiply(cost).setScale(2, RoundingMode.HALF_UP);

            BigDecimal currentLocTotal = locationCountedValues.getOrDefault(loc, BigDecimal.ZERO);
            locationCountedValues.put(loc, currentLocTotal.add(locVal));
        }
    }

    /**
     * Generates a printable A4 PDF document containing the variance report and shrinkage matrix.
     *
     * @param sessionId Identifier of the audit session
     * @return Generated PDF byte array
     */
    @Transactional(readOnly = true)
    public byte[] exportPdf(Long sessionId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);
        return pdfService.generateInventoryAuditPdf(session);
    }

    /**
     * Exports the inventory audit variance matrix as an RFC-4180 compliant CSV byte array.
     *
     * @param sessionId Identifier of the audit session
     * @return CSV encoded byte array
     */
    @Transactional(readOnly = true)
    public byte[] exportCsv(Long sessionId) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);
        InventoryAuditSession session = getSessionEntity(sessionId);

        StringBuilder sb = new StringBuilder();
        sb.append("Reference;Title;Status;Created_At;Finalized_At\n");
        sb.append(escapeCsv(session.getReferenceCode())).append(";")
                .append(escapeCsv(session.getTitle())).append(";")
                .append(session.getStatus()).append(";")
                .append(session.getCreatedAt() != null ? session.getCreatedAt().format(CSV_DATE_FMT) : "").append(";")
                .append(session.getFinalizedAt() != null ? session.getFinalizedAt().format(CSV_DATE_FMT) : "").append("\n\n");

        sb.append("Ingredient_ID;Ingredient_Nom;Categorie;Unite;Stock_Theorique;Stock_Compte;Ecart_Quantite;Cout_Unitaire_HT;Valeur_Theorique_HT;Valeur_Comptee_HT;Ecart_Valeur_HT;Statut\n");

        for (InventoryAuditItem item : session.getItems()) {
            sb.append(formatCsvRow(item)).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String formatCsvRow(InventoryAuditItem item) {
        Long id = item.getIngredient() != null ? item.getIngredient().getId() : 0L;
        String nom = item.getIngredient() != null ? item.getIngredient().getNom() : "";
        String cat = item.getIngredient() != null ? item.getIngredient().getCategory() : "";
        String unite = item.getIngredient() != null ? item.getIngredient().getUniteMesure() : "";
        BigDecimal theo = item.getTheoreticalQuantity() != null ? item.getTheoreticalQuantity() : BigDecimal.ZERO;
        String counted = item.getCountedQuantity() != null ? item.getCountedQuantity().toPlainString() : "";
        BigDecimal varQ = item.getVarianceQuantity() != null ? item.getVarianceQuantity() : BigDecimal.ZERO;
        BigDecimal cost = item.getUnitCostHt() != null ? item.getUnitCostHt() : BigDecimal.ZERO;
        BigDecimal theoVal = item.getTheoreticalValueHt() != null ? item.getTheoreticalValueHt() : BigDecimal.ZERO;
        BigDecimal countedVal = item.getCountedValueHt() != null ? item.getCountedValueHt() : BigDecimal.ZERO;
        BigDecimal varVal = item.getVarianceValueHt() != null ? item.getVarianceValueHt() : BigDecimal.ZERO;
        String status = resolveCsvStatus(varQ);

        return String.join(";",
                String.valueOf(id),
                escapeCsv(nom),
                escapeCsv(cat),
                escapeCsv(unite),
                theo.toPlainString(),
                counted,
                varQ.toPlainString(),
                cost.toPlainString(),
                theoVal.toPlainString(),
                countedVal.toPlainString(),
                varVal.toPlainString(),
                status
        );
    }

    private String resolveCsvStatus(BigDecimal varQ) {
        if (varQ.compareTo(BigDecimal.ZERO) == 0) {
            return "CONFORME";
        }
        if (varQ.compareTo(BigDecimal.ZERO) < 0) {
            return "PERTE_SHRINKAGE";
        }
        return "SURPLUS";
    }

    private void validateSessionNotLocked(InventoryAuditSession session) {
        if (session.getStatus() == InventoryAuditStatus.FINALIZED || session.getStatus() == InventoryAuditStatus.CANCELLED) {
            throw new BusinessException("Cannot modify counts in a " + session.getStatus() + " session");
        }
    }

    private InventoryAuditSession getSessionEntity(Long sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory audit session not found with ID: " + sessionId));
    }

    private String generateReferenceCode() {
        String datePart = timeService.now().format(REF_DATE_FMT);
        long countToday = sessionRepository.findAll().stream()
                .filter(s -> s.getReferenceCode() != null && s.getReferenceCode().contains(datePart))
                .count();
        return String.format(Locale.ROOT, "INV-%s-%03d", datePart, countToday + 1);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
