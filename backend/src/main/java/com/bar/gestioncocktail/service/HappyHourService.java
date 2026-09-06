package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.PricingPreviewResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.DiscountType;
import com.bar.gestioncocktail.model.HappyHourRule;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.HappyHourRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Business service responsible for managing Happy Hour promotional pricing rules
 * and dynamically resolving drink prices based on time schedules and promotional windows.
 */
@Service
public class HappyHourService {

    private static final Logger log = LoggerFactory.getLogger(HappyHourService.class);
    private static final String NOT_FOUND_ID_PREFIX = "Happy Hour rule not found with id: ";
    private static final String ENTITY_NAME = "HappyHourRule";

    private final HappyHourRuleRepository ruleRepository;
    private final CocktailRepository cocktailRepository;
    private final CocktailVarianteRepository varianteRepository;
    private final TimeService timeService;
    private final AuditLogService auditLogService;

    /**
     * Constructs the service with required repositories and audit dependencies.
     *
     * @param ruleRepository     Happy hour rule repository
     * @param cocktailRepository Cocktail entity repository
     * @param varianteRepository Cocktail variant repository
     * @param timeService        Application time management service
     * @param auditLogService    Audit logging service
     */
    public HappyHourService(
            HappyHourRuleRepository ruleRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            TimeService timeService,
            AuditLogService auditLogService
    ) {
        this.ruleRepository = ruleRepository;
        this.cocktailRepository = cocktailRepository;
        this.varianteRepository = varianteRepository;
        this.timeService = timeService;
        this.auditLogService = auditLogService;
    }

    /**
     * Retrieves all configured Happy Hour promotional rules.
     *
     * @return List of all rules
     */
    @Transactional(readOnly = true)
    public List<HappyHourRule> getAllRules() {
        return ruleRepository.findAll();
    }

    /**
     * Retrieves all active Happy Hour rules.
     *
     * @return List of rules marked as active
     */
    @Transactional(readOnly = true)
    public List<HappyHourRule> getActiveRules() {
        return ruleRepository.findByActiveTrue();
    }

    /**
     * Finds a Happy Hour rule by its unique identifier.
     *
     * @param id Rule identifier
     * @return Optional containing the rule if found
     */
    @Transactional(readOnly = true)
    public Optional<HappyHourRule> getRuleById(Long id) {
        return ruleRepository.findById(id);
    }

    /**
     * Creates and persists a new Happy Hour promotional rule.
     *
     * @param rule Entity to create
     * @return Saved entity
     */
    @Transactional
    public HappyHourRule createRule(HappyHourRule rule) {
        validateRule(rule);

        LocalDateTime now = timeService.now();
        rule.setCreatedAt(now);
        rule.setUpdatedAt(now);

        HappyHourRule saved = ruleRepository.save(rule);
        auditLogService.logAction(null, "CREATE_HAPPY_HOUR_RULE", ENTITY_NAME, saved.getId(),
                "Created Happy Hour rule: " + saved.getName(), null);
        log.info("Created Happy Hour rule id={} name='{}'", saved.getId(), saved.getName());
        return saved;
    }

    /**
     * Updates an existing Happy Hour promotional rule.
     *
     * @param id          Rule identifier to update
     * @param ruleDetails New rule attributes
     * @return Updated entity
     */
    @Transactional
    public HappyHourRule updateRule(Long id, HappyHourRule ruleDetails) {
        HappyHourRule existing = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + id));

        validateRule(ruleDetails);

        existing.setName(ruleDetails.getName());
        existing.setStartTime(ruleDetails.getStartTime());
        existing.setEndTime(ruleDetails.getEndTime());
        existing.setDaysOfWeek(ruleDetails.getDaysOfWeek());
        existing.setDiscountType(ruleDetails.getDiscountType());
        existing.setDiscountValue(ruleDetails.getDiscountValue());
        existing.setActive(ruleDetails.isActive());
        existing.setCategories(ruleDetails.getCategories());
        existing.setCocktailIds(ruleDetails.getCocktailIds());
        existing.setUpdatedAt(timeService.now());

        HappyHourRule saved = ruleRepository.save(existing);
        auditLogService.logAction(null, "UPDATE_HAPPY_HOUR_RULE", ENTITY_NAME, saved.getId(),
                "Updated Happy Hour rule: " + saved.getName(), null);
        log.info("Updated Happy Hour rule id={} name='{}'", saved.getId(), saved.getName());
        return saved;
    }

    /**
     * Deletes a promotional rule.
     *
     * @param id Rule identifier to delete
     */
    @Transactional
    public void deleteRule(Long id) {
        HappyHourRule existing = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + id));

        ruleRepository.delete(existing);
        auditLogService.logAction(null, "DELETE_HAPPY_HOUR_RULE", ENTITY_NAME, id,
                "Deleted Happy Hour rule: " + existing.getName(), null);
        log.info("Deleted Happy Hour rule id={}", id);
    }

    /**
     * Toggles the active status of a rule.
     *
     * @param id Rule identifier to toggle
     * @return Updated entity
     */
    @Transactional
    public HappyHourRule toggleActive(Long id) {
        HappyHourRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_ID_PREFIX + id));

        rule.setActive(!rule.isActive());
        rule.setUpdatedAt(timeService.now());

        HappyHourRule saved = ruleRepository.save(rule);
        auditLogService.logAction(null, "TOGGLE_HAPPY_HOUR_RULE", ENTITY_NAME, id,
                "Toggled Happy Hour rule active=" + saved.isActive() + " for: " + saved.getName(), null);
        log.info("Toggled Happy Hour rule id={} active={}", id, saved.isActive());
        return saved;
    }

    /**
     * Dynamically calculates the effective selling price for a drink at a given point in time,
     * taking into account any applicable active Happy Hour rules.
     *
     * @param cocktail  Cocktail being ordered or displayed
     * @param variante  Optional variant being selected
     * @param timestamp Reference date and time (uses current system time if null)
     * @return Calculated effective unit price
     */
    @Transactional(readOnly = true)
    public BigDecimal resolveEffectivePrice(Cocktail cocktail, CocktailVariante variante, LocalDateTime timestamp) {
        if (cocktail == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal basePrice = calculateBasePrice(cocktail, variante);
        LocalDateTime evalTime = timestamp != null ? timestamp : timeService.now();

        List<HappyHourRule> activeRules = ruleRepository.findByActiveTrue();
        if (activeRules.isEmpty()) {
            return basePrice;
        }

        return activeRules.stream()
                .filter(rule -> rule.isApplicableAt(evalTime))
                .filter(rule -> rule.matchesCocktail(cocktail))
                .map(rule -> rule.calculateDiscountedPrice(basePrice))
                .min(Comparator.naturalOrder())
                .orElse(basePrice);
    }

    /**
     * Simulates the price calculation for a cocktail at a given timestamp and returns complete diagnostic details.
     *
     * @param cocktailId Unique cocktail identifier
     * @param varianteId Optional variant identifier
     * @param timestamp  Simulation evaluation time
     * @return Pricing preview result DTO
     */
    @Transactional(readOnly = true)
    public PricingPreviewResponseDTO simulatePricing(Long cocktailId, Long varianteId, LocalDateTime timestamp) {
        Cocktail cocktail = cocktailRepository.findById(cocktailId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found with id: " + cocktailId));

        CocktailVariante variante = null;
        if (varianteId != null) {
            variante = varianteRepository.findById(varianteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found with id: " + varianteId));
        }

        BigDecimal basePrice = calculateBasePrice(cocktail, variante);
        LocalDateTime evalTime = timestamp != null ? timestamp : timeService.now();

        List<HappyHourRule> matchingRules = ruleRepository.findByActiveTrue().stream()
                .filter(rule -> rule.isApplicableAt(evalTime))
                .filter(rule -> rule.matchesCocktail(cocktail))
                .toList();

        if (matchingRules.isEmpty()) {
            return new PricingPreviewResponseDTO(
                    cocktail.getId(),
                    cocktail.getNom(),
                    variante != null ? variante.getId() : null,
                    variante != null ? variante.getNom() : null,
                    basePrice,
                    basePrice,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    false,
                    null,
                    null,
                    null,
                    null,
                    evalTime
            );
        }

        // Find winning rule providing the best discount (lowest price)
        HappyHourRule winningRule = matchingRules.stream()
                .min(Comparator.comparing(r -> r.calculateDiscountedPrice(basePrice)))
                .orElse(matchingRules.getFirst());

        BigDecimal effectivePrice = winningRule.calculateDiscountedPrice(basePrice);
        BigDecimal discountAmount = basePrice.subtract(effectivePrice).max(BigDecimal.ZERO);
        BigDecimal discountPercentage = basePrice.compareTo(BigDecimal.ZERO) > 0
                ? discountAmount.multiply(BigDecimal.valueOf(100)).divide(basePrice, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new PricingPreviewResponseDTO(
                cocktail.getId(),
                cocktail.getNom(),
                variante != null ? variante.getId() : null,
                variante != null ? variante.getNom() : null,
                basePrice,
                effectivePrice,
                discountAmount,
                discountPercentage,
                true,
                winningRule.getId(),
                winningRule.getName(),
                winningRule.getDiscountType(),
                winningRule.getDiscountValue(),
                evalTime
        );
    }

    /**
     * Calculates the regular menu price of a drink including any selected variant extra charge.
     *
     * @param cocktail Cocktail entity
     * @param variante Optional variant entity
     * @return Base price
     */
    public BigDecimal calculateBasePrice(Cocktail cocktail, CocktailVariante variante) {
        BigDecimal price = cocktail.getPrix() != null ? cocktail.getPrix() : BigDecimal.ZERO;
        if (variante != null && variante.getPrixSupplement() != null) {
            price = price.add(variante.getPrixSupplement());
        }
        return price;
    }

    private void validateRule(HappyHourRule rule) {
        if (rule == null) {
            throw new BusinessException("Rule payload is required");
        }
        if (rule.getName() == null || rule.getName().isBlank()) {
            throw new BusinessException("Rule name cannot be blank");
        }
        if (rule.getStartTime() == null || rule.getEndTime() == null) {
            throw new BusinessException("Start time and end time are required");
        }
        if (rule.getDiscountType() == null) {
            throw new BusinessException("Discount type is required");
        }
        if (rule.getDiscountValue() == null || rule.getDiscountValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Discount value cannot be negative");
        }
        if (rule.getDiscountType() == DiscountType.PERCENTAGE
                && rule.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("Percentage discount cannot exceed 100%");
        }
    }
}
