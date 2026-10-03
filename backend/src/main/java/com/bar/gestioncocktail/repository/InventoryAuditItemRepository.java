package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.InventoryAuditItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link InventoryAuditItem} entities.
 */
@Repository
public interface InventoryAuditItemRepository extends JpaRepository<InventoryAuditItem, Long> {

    /**
     * Retrieves all audited line items associated with a given audit session ID.
     *
     * @param sessionId Unique identifier of the inventory audit session
     * @return List of audit line items
     */
    List<InventoryAuditItem> findBySessionId(Long sessionId);

    /**
     * Finds a specific line item in an audit session by ingredient ID.
     *
     * @param sessionId Identifier of the audit session
     * @param ingredientId Identifier of the ingredient
     * @return Optional containing matching audit line item
     */
    Optional<InventoryAuditItem> findBySessionIdAndIngredientId(Long sessionId, Long ingredientId);

    /**
     * Retrieves all historical audit entries recorded for a specific ingredient.
     *
     * @param ingredientId Identifier of the ingredient
     * @return List of historical audit items
     */
    List<InventoryAuditItem> findByIngredientId(Long ingredientId);
}
