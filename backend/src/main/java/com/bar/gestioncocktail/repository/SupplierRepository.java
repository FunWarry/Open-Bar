package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Supplier} entities.
 */
@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    /**
     * Retrieves all suppliers ordered alphabetically by company name.
     *
     * @return list of suppliers
     */
    List<Supplier> findAllByOrderByNomAsc();

    /**
     * Retrieves all active suppliers ordered by name.
     *
     * @return list of active suppliers
     */
    List<Supplier> findByActifTrueOrderByNomAsc();

    /**
     * Searches suppliers matching a query string in company name, contact, or email.
     *
     * @param query search query
     * @return list of matching suppliers
     */
    List<Supplier> findByNomContainingIgnoreCaseOrContactNomContainingIgnoreCaseOrderByNomAsc(String query, String query2);

    /**
     * Finds a supplier by exact company name ignoring case.
     *
     * @param nom company name
     * @return optional supplier
     */
    Optional<Supplier> findByNomIgnoreCase(String nom);
}
