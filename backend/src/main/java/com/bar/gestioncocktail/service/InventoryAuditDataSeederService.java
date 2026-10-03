package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.InventoryAuditItem;
import com.bar.gestioncocktail.model.InventoryAuditLocationCount;
import com.bar.gestioncocktail.model.InventoryAuditSession;
import com.bar.gestioncocktail.model.InventoryAuditStatus;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.InventoryAuditItemRepository;
import com.bar.gestioncocktail.repository.InventoryAuditLocationCountRepository;
import com.bar.gestioncocktail.repository.InventoryAuditSessionRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service responsible for automatically seeding initial periodic physical inventory audit sessions
 * from the JSON dataset file 'data/demo_dataset.json' on application startup in 'dev', 'test', and 'staging' profiles.
 */
@Service
@DependsOn("sampleDataSeederService")
@Profile({"dev", "test", "staging"})
public class InventoryAuditDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(InventoryAuditDataSeederService.class);
    private static final String DATASET_PATH = "data/demo_dataset.json";
    private static final String KEY_NOTES = "notes";

    private final InventoryAuditSessionRepository auditSessionRepository;
    private final InventoryAuditItemRepository auditItemRepository;
    private final InventoryAuditLocationCountRepository locationCountRepository;
    private final IngredientRepository ingredientRepository;
    private final UserRepository userRepository;
    private final TimeService timeService;
    private final ObjectMapper objectMapper;

    /**
     * Constructs the inventory audit data seeder service with required repositories.
     *
     * @param auditSessionRepository repository for audit sessions
     * @param auditItemRepository repository for audit items
     * @param locationCountRepository repository for audit location counts
     * @param ingredientRepository repository for ingredients
     * @param userRepository repository for users
     * @param timeService current time provider
     * @param objectMapper json object mapper
     */
    public InventoryAuditDataSeederService(
            InventoryAuditSessionRepository auditSessionRepository,
            InventoryAuditItemRepository auditItemRepository,
            InventoryAuditLocationCountRepository locationCountRepository,
            IngredientRepository ingredientRepository,
            UserRepository userRepository,
            TimeService timeService,
            ObjectMapper objectMapper) {
        this.auditSessionRepository = auditSessionRepository;
        this.auditItemRepository = auditItemRepository;
        this.locationCountRepository = locationCountRepository;
        this.ingredientRepository = ingredientRepository;
        this.userRepository = userRepository;
        this.timeService = timeService;
        this.objectMapper = objectMapper;
    }

    /**
     * Seeds predefined inventory audit sessions on startup if the session table is empty.
     */
    @PostConstruct
    @Transactional
    public void seedInventoryAuditsIfEmpty() {
        if (auditSessionRepository.count() > 0 && auditItemRepository.count() > 0) {
            log.info("Inventory audit sessions already populated, skipping seeder.");
            return;
        }

        if (auditSessionRepository.count() > 0 && auditItemRepository.count() == 0) {
            log.info("Found empty inventory audit sessions with 0 items, clearing them for clean seeding...");
            auditSessionRepository.deleteAll();
        }

        log.info("Seeding demo inventory audit sessions from '{}'...", DATASET_PATH);
        try (InputStream is = new ClassPathResource(DATASET_PATH).getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            JsonNode auditsNode = root.get("inventory_audits");
            if (auditsNode != null && auditsNode.isArray()) {
                for (JsonNode sessionNode : auditsNode) {
                    seedAuditSession(sessionNode);
                }
            }
            log.info("Successfully seeded demo inventory audit sessions.");
        } catch (Exception e) {
            log.warn("Failed to seed demo inventory audit sessions from dataset: {}", e.getMessage());
        }
    }

    private void seedAuditSession(JsonNode node) {
        String refCode = node.get("referenceCode").asText();
        String title = node.get("title").asText();
        InventoryAuditStatus status = InventoryAuditStatus.valueOf(node.get("status").asText());
        String locationScope = node.hasNonNull("storageLocationScope") ? node.get("storageLocationScope").asText() : "ALL";
        String categoryScope = node.hasNonNull("categoryScope") ? node.get("categoryScope").asText() : null;
        String notes = node.hasNonNull(KEY_NOTES) ? node.get(KEY_NOTES).asText() : null;
        int daysAgo = node.hasNonNull("daysAgo") ? node.get("daysAgo").asInt() : 0;

        String createdByUsername = node.hasNonNull("createdByUser") ? node.get("createdByUser").asText() : "admin";
        Optional<User> userOpt = userRepository.findByUsername(createdByUsername);
        User creator = userOpt.orElse(null);

        InventoryAuditSession session = new InventoryAuditSession();
        session.setReferenceCode(refCode);
        session.setTitle(title);
        session.setStatus(status);
        session.setStorageLocationScope(locationScope);
        session.setCategoryScope(categoryScope);
        session.setNotes(notes);
        session.setCreatedBy(creator);

        LocalDateTime now = timeService.now();
        LocalDateTime sessionCreated = now.minusDays(daysAgo);
        session.setCreatedAt(sessionCreated);
        if (status == InventoryAuditStatus.IN_PROGRESS || status == InventoryAuditStatus.FINALIZED) {
            session.setStartedAt(sessionCreated.plusMinutes(15));
        }
        if (status == InventoryAuditStatus.FINALIZED) {
            session.setFinalizedAt(sessionCreated.plusHours(2));
            session.setFinalizedBy(creator);
        }

        InventoryAuditSession savedSession = auditSessionRepository.save(session);
        populateSessionItems(savedSession, node.get("items"));
    }

    private void populateSessionItems(InventoryAuditSession session, JsonNode itemsNode) {
        if (itemsNode == null || !itemsNode.isArray()) {
            return;
        }

        BigDecimal totalTheoretical = BigDecimal.ZERO;
        BigDecimal totalCounted = BigDecimal.ZERO;
        BigDecimal totalVariance = BigDecimal.ZERO;

        List<InventoryAuditItem> items = new ArrayList<>();
        for (JsonNode itemNode : itemsNode) {
            String ingredientNom = itemNode.get("ingredientNom").asText();
            Optional<Ingredient> ingOpt = ingredientRepository.findByNomIgnoreCase(ingredientNom);
            if (ingOpt.isEmpty()) {
                continue;
            }
            Ingredient ing = ingOpt.get();

            BigDecimal actualStock = new BigDecimal(itemNode.get("actualStock").asText());
            BigDecimal snapshotStock = ing.getQuantiteStock() != null ? ing.getQuantiteStock() : BigDecimal.valueOf(840.0);
            BigDecimal unitCost = ing.getPrixUnitaire() != null ? ing.getPrixUnitaire() : BigDecimal.valueOf(18.00);

            BigDecimal varQty = actualStock.subtract(snapshotStock).setScale(3, RoundingMode.HALF_UP);
            BigDecimal theoVal = snapshotStock.multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
            BigDecimal countedVal = actualStock.multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
            BigDecimal varCost = countedVal.subtract(theoVal).setScale(2, RoundingMode.HALF_UP);

            InventoryAuditItem item = new InventoryAuditItem();
            item.setSession(session);
            item.setIngredient(ing);
            item.setTheoreticalQuantity(snapshotStock);
            item.setUnitCostHt(unitCost);
            item.setCountedQuantity(actualStock);
            item.setTheoreticalValueHt(theoVal);
            item.setCountedValueHt(countedVal);
            item.setVarianceQuantity(varQty);
            item.setVarianceValueHt(varCost);
            item.setNotes(itemNode.hasNonNull(KEY_NOTES) ? itemNode.get(KEY_NOTES).asText() : null);

            InventoryAuditItem savedItem = auditItemRepository.save(item);
            items.add(savedItem);
            populateLocationCounts(savedItem, session.getCreatedBy(), itemNode.get("locationCounts"));

            totalTheoretical = totalTheoretical.add(theoVal);
            totalCounted = totalCounted.add(countedVal);
            totalVariance = totalVariance.add(varCost);
        }

        session.setItems(items);
        session.setTotalTheoreticalValueHt(totalTheoretical.setScale(2, RoundingMode.HALF_UP));
        session.setTotalCountedValueHt(totalCounted.setScale(2, RoundingMode.HALF_UP));
        session.setTotalVarianceValueHt(totalVariance.setScale(2, RoundingMode.HALF_UP));
        auditSessionRepository.save(session);
    }

    private void populateLocationCounts(InventoryAuditItem item, User user, JsonNode locationsNode) {
        if (locationsNode == null || !locationsNode.isArray()) {
            return;
        }
        for (JsonNode locNode : locationsNode) {
            InventoryAuditLocationCount loc = new InventoryAuditLocationCount();
            loc.setAuditItem(item);
            loc.setStorageLocation(locNode.get("storageLocation").asText());
            loc.setFullContainersCount(locNode.get("fullContainersCount").asInt());
            loc.setPartialQuantity(new BigDecimal(locNode.get("partialFraction").asText()));
            loc.setCountedQuantity(new BigDecimal(locNode.get("exactQuantity").asText()));
            loc.setCountedAt(timeService.now());
            loc.setCountedBy(user);
            locationCountRepository.save(loc);
        }
    }
}
