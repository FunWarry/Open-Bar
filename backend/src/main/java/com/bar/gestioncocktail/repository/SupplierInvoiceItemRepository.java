package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.SupplierInvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link SupplierInvoiceItem} entities.
 */
@Repository
public interface SupplierInvoiceItemRepository extends JpaRepository<SupplierInvoiceItem, Long> {

    /**
     * Finds all line items belonging to an invoice ordered by line number.
     *
     * @param invoiceId invoice identifier
     * @return list of invoice line items
     */
    List<SupplierInvoiceItem> findByInvoiceIdOrderByLineNumberAsc(Long invoiceId);

    /**
     * Finds invoice line items matched to a specific ingredient.
     *
     * @param ingredientId ingredient identifier
     * @return list of matched line items
     */
    List<SupplierInvoiceItem> findByMatchedIngredientId(Long ingredientId);
}
