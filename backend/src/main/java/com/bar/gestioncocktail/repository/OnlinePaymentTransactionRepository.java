package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.OnlinePaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for {@link OnlinePaymentTransaction} entities.
 */
@Repository
public interface OnlinePaymentTransactionRepository extends JpaRepository<OnlinePaymentTransaction, Long> {

    /**
     * Finds a transaction by its unique provider reference (e.g. Stripe PaymentIntent ID).
     *
     * @param transactionId Provider transaction ID
     * @return Optional containing the transaction if found
     */
    Optional<OnlinePaymentTransaction> findByTransactionId(String transactionId);

    /**
     * Finds a transaction by its client idempotency key to prevent double charging.
     *
     * @param idempotencyKey Client idempotency UUID
     * @return Optional containing the transaction if found
     */
    Optional<OnlinePaymentTransaction> findByIdempotencyKey(String idempotencyKey);

    /**
     * Finds all transactions for a table ordered by creation date descending.
     *
     * @param tableId Scanned table identifier
     * @return List of transactions
     */
    List<OnlinePaymentTransaction> findByTableIdOrderByCreatedAtDesc(Long tableId);
}
