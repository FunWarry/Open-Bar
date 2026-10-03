package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Reservation;
import com.bar.gestioncocktail.model.ReservationStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Spring Data JPA repository for {@link Reservation} persistence operations.
 */
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    /**
     * Retrieves all reservations scheduled for a given date ordered chronologically.
     *
     * @param date Target reservation date
     * @return List of matching reservations
     */
    List<Reservation> findByDateReservationOrderByHeureReservationAsc(LocalDate date);

    /**
     * Retrieves all reservations within an inclusive date range ordered chronologically.
     *
     * @param from Start date
     * @param to   End date
     * @return List of matching reservations
     */
    List<Reservation> findByDateReservationBetweenOrderByDateReservationAscHeureReservationAsc(LocalDate from, LocalDate to);

    /**
     * Retrieves all reservations for a specific table on a given date.
     *
     * @param tableId Target table identifier
     * @param date    Target reservation date
     * @return List of matching reservations
     */
    List<Reservation> findByTableIdAndDateReservation(Long tableId, LocalDate date);

    /**
     * Retrieves reservations for a specific table on a date with matching statuses.
     *
     * @param tableId Target table identifier
     * @param date    Target reservation date
     * @param statuts Collection of target statuses
     * @return List of matching reservations
     */
    List<Reservation> findByTableIdAndDateReservationAndStatutIn(Long tableId, LocalDate date, Collection<ReservationStatut> statuts);

    /**
     * Retrieves all reservations matching a specific status on a given date.
     *
     * @param date   Target reservation date
     * @param statut Reservation status
     * @return List of matching reservations
     */
    List<Reservation> findByDateReservationAndStatutOrderByHeureReservationAsc(LocalDate date, ReservationStatut statut);

    /**
     * Searches for reservations by customer name or phone substring.
     *
     * @param query Search query text
     * @return List of matching reservations
     */
    @Query("SELECT r FROM Reservation r WHERE LOWER(r.nomClient) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(r.telephone) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY r.dateReservation DESC, r.heureReservation DESC")
    List<Reservation> searchByCustomerInfo(@Param("query") String query);

    /**
     * Returns distinct previous customer contact profiles for auto-suggestion.
     *
     * @param query Search prefix or substring
     * @return List of past reservations for auto-filling customer details
     */
    @Query("SELECT r FROM Reservation r WHERE LOWER(r.nomClient) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY r.id DESC")
    List<Reservation> findSuggestionsByName(@Param("query") String query);
}
