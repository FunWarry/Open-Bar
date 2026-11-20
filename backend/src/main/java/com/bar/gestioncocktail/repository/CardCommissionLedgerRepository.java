package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.CardCommissionLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link CardCommissionLedgerEntry}.
 */
public interface CardCommissionLedgerRepository extends JpaRepository<CardCommissionLedgerEntry, Long> {

    /**
     * Retrieves the most recent ledger entry in monotonic sequence order.
     *
     * @return Latest entry if present
     */
    Optional<CardCommissionLedgerEntry> findTopByOrderBySequenceNumberDesc();

    /**
     * Retrieves all entries ordered chronologically by sequence number ascending for SHA-256 chain verification.
     *
     * @return Complete ordered ledger
     */
    List<CardCommissionLedgerEntry> findAllByOrderBySequenceNumberAsc();

    /**
     * Retrieves all entries for a given billing period (YYYY-MM) ordered chronologically.
     *
     * @param billingPeriod Target billing month
     * @return Ordered entries for the billing period
     */
    List<CardCommissionLedgerEntry> findByBillingPeriodOrderBySequenceNumberAsc(String billingPeriod);

    /**
     * Checks idempotency by external payment transaction ID (TPE UUID or Stripe PaymentIntent ID).
     *
     * @param externalTransactionId External transaction reference
     * @return True if already recorded
     */
    boolean existsByExternalTransactionId(String externalTransactionId);

    /**
     * Finds an existing ledger entry by external transaction ID.
     *
     * @param externalTransactionId External transaction reference
     * @return Matching entry if found
     */
    Optional<CardCommissionLedgerEntry> findByExternalTransactionId(String externalTransactionId);

    /**
     * Checks whether a given invoice + optional split settlement was already recorded in the ledger.
     *
     * @param factureId   Invoice identifier
     * @param reglementId Split settlement identifier
     * @return True if already recorded
     */
    boolean existsByFactureIdAndReglementId(Long factureId, Long reglementId);

    /**
     * Checks whether an invoice (without split settlement) was already recorded in the ledger.
     *
     * @param factureId Invoice identifier
     * @return True if recorded with null reglementId
     */
    boolean existsByFactureIdAndReglementIdIsNull(Long factureId);
}
