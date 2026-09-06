package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.DailyCashClosure;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing an official registered daily cash closure (Z-Report).
 *
 * @param id Closure unique database identifier
 * @param closureNumber Serial Z-report numbering (e.g. Z-YYYY-NNNNN)
 * @param closureDate Date of the closed business day
 * @param openingFloat Initial opening cash float
 * @param theoreticalCash Theoretical expected cash (opening float + settled cash payments)
 * @param countedCash Physically counted cash in drawer
 * @param cashDiscrepancy Reconciliation difference (counted - theoretical)
 * @param totalRevenueHT Total daily pre-tax revenue
 * @param totalRevenueTTC Total daily revenue including tax
 * @param vatBreakdownJson Serialized JSON of VAT rate distribution
 * @param paymentMethodsJson Serialized JSON of payment modes breakdown
 * @param countingBreakdownJson Serialized JSON of physical cash denominations
 * @param discrepancyReason Optional audit justification for cash discrepancies
 * @param closedByUsername Username of the operator who executed the closure
 * @param closedByName Full name of the operator who executed the closure
 * @param sha256Hash Cryptographic digital seal
 * @param createdAt Creation timestamp
 * @param updatedAt Last update timestamp
 */
public record DailyCashClosureResponseDTO(
        Long id,
        String closureNumber,
        LocalDate closureDate,
        BigDecimal openingFloat,
        BigDecimal theoreticalCash,
        BigDecimal countedCash,
        BigDecimal cashDiscrepancy,
        BigDecimal totalRevenueHT,
        BigDecimal totalRevenueTTC,
        String vatBreakdownJson,
        String paymentMethodsJson,
        String countingBreakdownJson,
        String discrepancyReason,
        String closedByUsername,
        String closedByName,
        String sha256Hash,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /**
     * Converts a JPA {@link DailyCashClosure} entity into a client-facing DTO.
     *
     * @param entity Source JPA entity
     * @return Immutable response DTO
     */
    public static DailyCashClosureResponseDTO from(DailyCashClosure entity) {
        if (entity == null) {
            return null;
        }

        String username = null;
        String fullName = null;
        if (entity.getClosedBy() != null) {
            username = entity.getClosedBy().getUsername();
            fullName = (entity.getClosedBy().getPrenom() != null ? entity.getClosedBy().getPrenom() + " " : "")
                    + (entity.getClosedBy().getNom() != null ? entity.getClosedBy().getNom() : "");
            if (fullName.isBlank()) {
                fullName = username;
            }
        }

        return new DailyCashClosureResponseDTO(
                entity.getId(),
                entity.getClosureNumber(),
                entity.getClosureDate(),
                entity.getOpeningFloat(),
                entity.getTheoreticalCash(),
                entity.getCountedCash(),
                entity.getCashDiscrepancy(),
                entity.getTotalRevenueHT(),
                entity.getTotalRevenueTTC(),
                entity.getVatBreakdownJson(),
                entity.getPaymentMethodsJson(),
                entity.getCountingBreakdownJson(),
                entity.getDiscrepancyReason(),
                username,
                fullName,
                entity.getSha256Hash(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
