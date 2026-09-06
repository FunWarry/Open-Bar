package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.StockWasteRequestDTO;
import com.bar.gestioncocktail.dto.StockWasteSummaryDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.model.StockWasteReason;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.StockMovementRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Service managing inventory stock movements, shrinkage declarations, and waste audit reporting.
 */
@Service
@Transactional
public class StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientService ingredientService;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final TimeService timeService;

    /**
     * Constructs the stock movement service with all required business dependencies.
     *
     * @param stockMovementRepository Repository for stock movement persistence
     * @param ingredientRepository Repository for ingredient queries
     * @param ingredientService Service for stock deduction and alert trigger
     * @param userRepository Repository for user authentication lookups
     * @param auditLogService Service for persistent audit trail logging
     * @param timeService Service for deterministic timestamping
     */
    public StockMovementService(
            StockMovementRepository stockMovementRepository,
            IngredientRepository ingredientRepository,
            IngredientService ingredientService,
            UserRepository userRepository,
            AuditLogService auditLogService,
            TimeService timeService) {
        this.stockMovementRepository = stockMovementRepository;
        this.ingredientRepository = ingredientRepository;
        this.ingredientService = ingredientService;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.timeService = timeService;
    }

    /**
     * Records an inventory waste, breakage, or loss event, deducts quantity from active stock,
     * calculates financial loss, records an audit log trace, and triggers low-stock alerts if applicable.
     *
     * @param request The waste declaration payload
     * @param username Username of the staff member declaring the shrinkage
     * @param ipAddress Client IP address for audit logging
     * @return Persisted {@link StockMovement} entity
     */
    public StockMovement recordWaste(StockWasteRequestDTO request, String username, String ipAddress) {
        if (request == null) {
            throw new BusinessException("Waste declaration request cannot be null.");
        }

        Ingredient ingredient = ingredientRepository.findById(request.ingredientId())
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient not found with ID: " + request.ingredientId()));

        if (request.quantity() == null || request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Wasted quantity must be greater than zero.");
        }

        BigDecimal currentStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock() : BigDecimal.ZERO;
        if (request.quantity().compareTo(currentStock) > 0) {
            throw new BusinessException(String.format(
                    "Declared waste quantity (%s) cannot exceed available inventory stock (%s).",
                    request.quantity(), currentStock));
        }

        BigDecimal newStock = currentStock.subtract(request.quantity());
        ingredientService.updateStock(ingredient, newStock);

        BigDecimal unitCost = ingredient.getPrixUnitaire() != null ? ingredient.getPrixUnitaire() : BigDecimal.ZERO;
        BigDecimal cost = request.quantity().multiply(unitCost).setScale(2, RoundingMode.HALF_UP);

        User reportedBy = username != null ? userRepository.findByUsername(username).orElse(null) : null;

        StockMovement movement = new StockMovement();
        movement.setIngredient(ingredient);
        movement.setQuantity(request.quantity());
        movement.setUnit(ingredient.getUniteMesure());
        movement.setReason(request.reason());
        movement.setReportedBy(reportedBy);
        movement.setNotes(request.notes());
        movement.setCost(cost);
        movement.setRecordedAt(timeService.now());

        StockMovement saved = stockMovementRepository.save(movement);

        String details = String.format("Stock waste recorded: %s %s of %s (%s, cost: %s EUR)",
                request.quantity(), ingredient.getUniteMesure(), ingredient.getNom(), request.reason(), cost);
        auditLogService.logAction(reportedBy, "STOCK_WASTE_RECORDED", "Ingredient", ingredient.getId(), details, ipAddress);

        return saved;
    }

    /**
     * Retrieves all recorded stock movements ordered chronologically descending.
     *
     * @return List of all stock movements
     */
    @Transactional(readOnly = true)
    public List<StockMovement> getAllMovements() {
        return stockMovementRepository.findAllByOrderByRecordedAtDesc();
    }

    /**
     * Retrieves stock movements recorded for a specific ingredient.
     *
     * @param ingredientId Identifier of the ingredient
     * @return List of matching stock movements
     */
    @Transactional(readOnly = true)
    public List<StockMovement> getMovementsByIngredient(Long ingredientId) {
        return stockMovementRepository.findByIngredientIdOrderByRecordedAtDesc(ingredientId);
    }

    /**
     * Aggregates consolidated stock shrinkage metrics, providing financial loss totals,
     * item counts, and breakdowns across each declared waste reason.
     *
     * @return Consolidated {@link StockWasteSummaryDTO}
     */
    @Transactional(readOnly = true)
    public StockWasteSummaryDTO getWasteSummary() {
        List<StockMovement> movements = stockMovementRepository.findAllByOrderByRecordedAtDesc();

        Map<StockWasteReason, BigDecimal> lossValueByReason = new EnumMap<>(StockWasteReason.class);
        Map<StockWasteReason, Long> countByReason = new EnumMap<>(StockWasteReason.class);

        for (StockWasteReason reason : StockWasteReason.values()) {
            lossValueByReason.put(reason, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            countByReason.put(reason, 0L);
        }

        BigDecimal totalLoss = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalQty = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (StockMovement m : movements) {
            BigDecimal cost = m.getCost() != null ? m.getCost() : BigDecimal.ZERO;
            BigDecimal qty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;

            totalLoss = totalLoss.add(cost);
            totalQty = totalQty.add(qty);

            if (m.getReason() != null) {
                BigDecimal currentLoss = lossValueByReason.getOrDefault(m.getReason(), BigDecimal.ZERO);
                lossValueByReason.put(m.getReason(), currentLoss.add(cost));

                long currentCount = countByReason.getOrDefault(m.getReason(), 0L);
                countByReason.put(m.getReason(), currentCount + 1L);
            }
        }

        return new StockWasteSummaryDTO(
                movements.size(),
                totalLoss,
                totalQty,
                lossValueByReason,
                countByReason
        );
    }
}
