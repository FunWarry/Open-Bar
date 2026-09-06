package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.TableCartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for managing collaborative {@link TableCartItem} instances.
 */
@Repository
public interface TableCartItemRepository extends JpaRepository<TableCartItem, Long> {

    /**
     * Finds all collaborative cart items currently stored for a given table in chronological order.
     *
     * @param tableId Table identifier
     * @return List of table cart items
     */
    List<TableCartItem> findByTableIdOrderByCreatedAtAsc(Long tableId);

    /**
     * Finds an existing cart item for a specific guest, cocktail, and variant at a table.
     *
     * @param tableId Table identifier
     * @param guestSessionId Unique guest session identifier
     * @param cocktailId Cocktail identifier
     * @param cocktailVarianteId Optional cocktail variant identifier
     * @return Optional containing existing cart item if present
     */
    Optional<TableCartItem> findByTableIdAndGuestSessionIdAndCocktailIdAndCocktailVarianteId(
            Long tableId, String guestSessionId, Long cocktailId, Long cocktailVarianteId);

    /**
     * Finds an existing cart item for a specific guest and cocktail without variant.
     *
     * @param tableId Table identifier
     * @param guestSessionId Unique guest session identifier
     * @param cocktailId Cocktail identifier
     * @return Optional containing existing cart item if present
     */
    Optional<TableCartItem> findByTableIdAndGuestSessionIdAndCocktailIdAndCocktailVarianteIdIsNull(
            Long tableId, String guestSessionId, Long cocktailId);

    /**
     * Deletes all collaborative cart items associated with a table.
     *
     * @param tableId Table identifier
     */
    void deleteByTableId(Long tableId);

    /**
     * Deletes all collaborative cart items associated with a specific guest at a table.
     *
     * @param tableId Table identifier
     * @param guestSessionId Unique guest session identifier
     */
    void deleteByTableIdAndGuestSessionId(Long tableId, String guestSessionId);
}
