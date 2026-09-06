package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.model.StockWasteReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link StockMovement} entities.
 */
@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /**
     * Retrieves all stock movements ordered by recorded timestamp descending.
     *
     * @return List of stock movements
     */
    List<StockMovement> findAllByOrderByRecordedAtDesc();

    /**
     * Retrieves stock movements recorded for a specific ingredient ordered by timestamp descending.
     *
     * @param ingredientId Identifier of the ingredient
     * @return List of matching stock movements
     */
    List<StockMovement> findByIngredientIdOrderByRecordedAtDesc(Long ingredientId);

    /**
     * Retrieves stock movements filtered by reason ordered by timestamp descending.
     *
     * @param reason The stock waste reason
     * @return List of matching stock movements
     */
    List<StockMovement> findByReasonOrderByRecordedAtDesc(StockWasteReason reason);
}
