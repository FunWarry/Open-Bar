package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Signed offline monthly Z-report & card commission proof bundle exported for manual
 * upload on the openbar.fr licensing portal when renewing air-gapped licenses.
 *
 * @param billingPeriod         Target billing period (YYYY-MM)
 * @param establishmentId       Establishment SIRET or fallback ID
 * @param generatedAt           UTC export generation timestamp
 * @param option1Volume         Total Option 1 card volume
 * @param option1Count          Total Option 1 transaction count
 * @param option1Commission     Total Option 1 commission due
 * @param option3Volume         Total Option 3 card volume
 * @param option3Count          Total Option 3 transaction count
 * @param option3Commission     Total Option 3 platform fee settled at source
 * @param totalCommissionDue    Net Option 1 commission payable on portal
 * @param startLedgerHash       SHA-256 hash of first entry in the period (or genesis)
 * @param endLedgerHash         SHA-256 hash of final entry in the period (or genesis)
 * @param ledgerChainValid      True if the entire local SHA-256 ledger passed verification
 * @param zReports              Cross-referenced certified daily Z-reports within the period
 * @param canonicalPayloadDigest SHA-256 digest of the canonical proof payload
 * @param hmacSignature         HMAC-SHA256 establishment-bound integrity signature
 * @param compactProofToken     Base64url-encoded compact proof token for copy/paste upload
 */
public record MonthlyCommissionProofDTO(
        String billingPeriod,
        String establishmentId,
        Instant generatedAt,
        BigDecimal option1Volume,
        long option1Count,
        BigDecimal option1Commission,
        BigDecimal option3Volume,
        long option3Count,
        BigDecimal option3Commission,
        BigDecimal totalCommissionDue,
        String startLedgerHash,
        String endLedgerHash,
        boolean ledgerChainValid,
        List<ZReportDigestDTO> zReports,
        String canonicalPayloadDigest,
        String hmacSignature,
        String compactProofToken
) {
    /**
     * Certified daily Z-report digest included in the monthly proof bundle.
     *
     * @param closureNumber   Sequential Z-report number
     * @param closureDate     Operational closure date
     * @param totalRevenueTTC Total TTC revenue recorded on the Z-report
     * @param sha256Hash      Certified NF525 SHA-256 seal of the Z-report
     */
    public record ZReportDigestDTO(
            String closureNumber,
            LocalDate closureDate,
            BigDecimal totalRevenueTTC,
            String sha256Hash
    ) {
    }
}
