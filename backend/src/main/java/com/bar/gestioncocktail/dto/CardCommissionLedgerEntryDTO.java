package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CardCommissionLedgerEntry;
import com.bar.gestioncocktail.model.CardCommissionSource;
import com.bar.gestioncocktail.model.CardCommissionStatus;
import com.bar.gestioncocktail.model.TpeMonetizationTier;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Read-only DTO representing a single immutable hash-chained card commission ledger record.
 *
 * @param id                   Database primary key
 * @param sequenceNumber       Monotonic chain sequence number
 * @param billingPeriod        Billing month (YYYY-MM)
 * @param establishmentId      Bound establishment identifier
 * @param factureId            Settled invoice ID (optional)
 * @param reglementId          Settled split payment ID (optional)
 * @param invoiceNumber        Human-readable invoice number
 * @param externalTransactionId TPE UUID or Stripe PaymentIntent ID
 * @param tpeAuthorizationCode Bank authorization code
 * @param tpeTerminalId        Terminal identifier
 * @param cardBrand            Card network brand
 * @param maskedPan            Masked primary account number
 * @param tier                 Applied monetization tier
 * @param source               Originating card payment channel
 * @param status               Commission settlement/sync status
 * @param grossAmount          Gross card payment amount
 * @param rateBps              Applied percentage rate in basis points
 * @param fixedFeeCents        Applied fixed fee in cents
 * @param commissionAmount     Computed platform commission
 * @param currency             ISO currency code
 * @param previousHash         SHA-256 hash of preceding ledger entry
 * @param entryHash            SHA-256 hash sealing this entry
 * @param recordedAt           UTC instant when recorded
 * @param syncedAt             UTC instant when transmitted online
 */
public record CardCommissionLedgerEntryDTO(
        Long id,
        Long sequenceNumber,
        String billingPeriod,
        String establishmentId,
        Long factureId,
        Long reglementId,
        String invoiceNumber,
        String externalTransactionId,
        String tpeAuthorizationCode,
        String tpeTerminalId,
        String cardBrand,
        String maskedPan,
        TpeMonetizationTier tier,
        CardCommissionSource source,
        CardCommissionStatus status,
        BigDecimal grossAmount,
        Integer rateBps,
        Integer fixedFeeCents,
        BigDecimal commissionAmount,
        String currency,
        String previousHash,
        String entryHash,
        Instant recordedAt,
        Instant syncedAt
) {
    /**
     * Maps a JPA {@link CardCommissionLedgerEntry} into an immutable DTO record.
     *
     * @param e Source entity
     * @return Immutable DTO
     */
    public static CardCommissionLedgerEntryDTO from(CardCommissionLedgerEntry e) {
        return new CardCommissionLedgerEntryDTO(
                e.getId(),
                e.getSequenceNumber(),
                e.getBillingPeriod(),
                e.getEstablishmentId(),
                e.getFactureId(),
                e.getReglementId(),
                e.getInvoiceNumber(),
                e.getExternalTransactionId(),
                e.getTpeAuthorizationCode(),
                e.getTpeTerminalId(),
                e.getCardBrand(),
                e.getMaskedPan(),
                e.getTier(),
                e.getSource(),
                e.getStatus(),
                e.getGrossAmount(),
                e.getRateBps(),
                e.getFixedFeeCents(),
                e.getCommissionAmount(),
                e.getCurrency(),
                e.getPreviousHash(),
                e.getEntryHash(),
                e.getRecordedAt(),
                e.getSyncedAt()
        );
    }
}
