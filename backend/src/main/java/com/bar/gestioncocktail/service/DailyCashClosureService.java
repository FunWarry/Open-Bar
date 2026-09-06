package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ClotureCaisseRequestDTO;
import com.bar.gestioncocktail.dto.DailyRecapDTO;
import com.bar.gestioncocktail.dto.PaymentModeSummaryDTO;
import com.bar.gestioncocktail.dto.VatSummaryDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.DailyCashClosure;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Service managing daily cash register closing workflows (Z-Report), cash drawer reconciliations,
 * discrepancy auditing, legal cryptographic seals, and standardized accounting exports.
 */
@Service
@Transactional(readOnly = true)
public class DailyCashClosureService {

    private static final Logger log = LoggerFactory.getLogger(DailyCashClosureService.class);

    private final DailyCashClosureRepository closureRepository;
    private final FactureService factureService;
    private final UserRepository userRepository;
    private final TimeService timeService;
    private final ObjectMapper objectMapper;

    /**
     * Constructs the service with required dependencies.
     *
     * @param closureRepository Daily cash closures repository
     * @param factureService Invoicing and daily financial summary service
     * @param userRepository User accounts repository
     * @param timeService Establishment timezone and time service
     */
    public DailyCashClosureService(
            DailyCashClosureRepository closureRepository,
            FactureService factureService,
            UserRepository userRepository,
            TimeService timeService) {
        this.closureRepository = closureRepository;
        this.factureService = factureService;
        this.userRepository = userRepository;
        this.timeService = timeService;
        this.objectMapper = new ObjectMapper()
                .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .findAndRegisterModules();
    }

    /**
     * Executes the daily register closing process (Z-Report) for a given date.
     * Locks sales for the date, calculates drawer discrepancies, produces a sequential
     * Z-number, computes a cryptographic SHA-256 seal, and persists the certified record.
     *
     * @param request Closure request data (date, opening float, counted cash, counting detail, notes)
     * @param operatorUsername Username of the authenticated staff member performing the closure
     * @return Created and sealed {@link DailyCashClosure}
     */
    @Transactional
    public DailyCashClosure cloturerCaisse(ClotureCaisseRequestDTO request, String operatorUsername) {
        LocalDate date = request.date() != null ? request.date() : LocalDate.now(timeService.getZoneId());
        validateDateNotClosed(date);

        DailyRecapDTO recap = factureService.getDailyRecap(date);
        BigDecimal openingFloat = request.openingFloat() != null ? request.openingFloat() : BigDecimal.ZERO;
        BigDecimal countedCash = request.countedCash() != null ? request.countedCash() : BigDecimal.ZERO;
        BigDecimal theoreticalCash = openingFloat.add(calculateCashPayments(recap));
        BigDecimal cashDiscrepancy = countedCash.subtract(theoreticalCash);

        validateDiscrepancyReason(cashDiscrepancy, request.discrepancyReason());

        User operator = resolveOperator(operatorUsername);
        DailyCashClosure closure = buildDailyCashClosure(date, request, recap, operator, theoreticalCash, cashDiscrepancy);

        DailyCashClosure saved = closureRepository.save(closure);
        log.info("Daily register successfully closed: Number={}, Date={}, TotalTTC={}, Discrepancy={}",
                saved.getClosureNumber(), saved.getClosureDate(), saved.getTotalRevenueTTC(), saved.getCashDiscrepancy());
        return saved;
    }

    private void validateDateNotClosed(LocalDate date) {
        if (closureRepository.existsByClosureDate(date)) {
            throw new BusinessException("Daily cash register is already closed for date: " + date);
        }
    }

    private void validateDiscrepancyReason(BigDecimal cashDiscrepancy, String discrepancyReason) {
        if (cashDiscrepancy.compareTo(BigDecimal.ZERO) != 0
                && (discrepancyReason == null || discrepancyReason.trim().isEmpty())) {
            throw new BusinessException("A justification note is mandatory when counted cash differs from expected cash");
        }
    }

    private User resolveOperator(String operatorUsername) {
        if (operatorUsername == null || operatorUsername.isBlank()) {
            return null;
        }
        return userRepository.findByUsername(operatorUsername).orElse(null);
    }

    private DailyCashClosure buildDailyCashClosure(
            LocalDate date,
            ClotureCaisseRequestDTO request,
            DailyRecapDTO recap,
            User operator,
            BigDecimal theoreticalCash,
            BigDecimal cashDiscrepancy) {
        String closureNumber = generateNextClosureNumber(date.getYear());
        String vatJson = serializeJson(recap.ventilationTva());
        String paymentMethodsJson = serializeJson(recap.ventilationModePaiement());
        String countingJson = serializeJson(request.countingBreakdown());

        DailyCashClosure closure = new DailyCashClosure();
        closure.setClosureNumber(closureNumber);
        closure.setClosureDate(date);
        closure.setOpeningFloat(request.openingFloat() != null ? request.openingFloat() : BigDecimal.ZERO);
        closure.setTheoreticalCash(theoreticalCash);
        closure.setCountedCash(request.countedCash() != null ? request.countedCash() : BigDecimal.ZERO);
        closure.setCashDiscrepancy(cashDiscrepancy);
        closure.setTotalRevenueHT(recap.totalCaHt());
        closure.setTotalRevenueTTC(recap.totalCaTtc());
        closure.setVatBreakdownJson(vatJson);
        closure.setPaymentMethodsJson(paymentMethodsJson);
        closure.setCountingBreakdownJson(countingJson);
        closure.setDiscrepancyReason(request.discrepancyReason() != null ? request.discrepancyReason().trim() : null);
        closure.setClosedBy(operator);

        String operatorName = (operator != null && operator.getUsername() != null) ? operator.getUsername() : "SYSTEM";
        closure.setSha256Hash(computeSha256Seal(closure, operatorName));
        return closure;
    }

    private BigDecimal calculateCashPayments(DailyRecapDTO recap) {
        if (recap.ventilationModePaiement() == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal sum = BigDecimal.ZERO;
        for (PaymentModeSummaryDTO pm : recap.ventilationModePaiement()) {
            if ("ESPECES".equalsIgnoreCase(pm.modePaiement()) || "CASH".equalsIgnoreCase(pm.modePaiement())) {
                sum = sum.add(pm.totalTtc());
            }
        }
        return sum;
    }

    private String generateNextClosureNumber(int year) {
        String yearPrefix = "Z-" + year + "-";
        long nextSequence = closureRepository.countByClosureNumberStartingWith(yearPrefix) + 1;
        return String.format("Z-%d-%05d", year, nextSequence);
    }

    /**
     * Lists all registered cash closures ordered by date descending.
     *
     * @return List of closures
     */
    public List<DailyCashClosure> getAllClosures() {
        return closureRepository.findAllByOrderByClosureDateDesc();
    }

    /**
     * Finds a register closure by its database ID.
     *
     * @param id Closure ID
     * @return Found closure
     */
    public DailyCashClosure getClosureById(Long id) {
        return closureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Register closure not found with ID: " + id));
    }

    /**
     * Finds a register closure by its business date.
     *
     * @param date Closure date
     * @return Optional closure
     */
    public Optional<DailyCashClosure> getClosureByDate(LocalDate date) {
        return closureRepository.findByClosureDate(date);
    }

    /**
     * Checks if a register closure exists for the given date.
     *
     * @param date Date to check
     * @return True if closed, false otherwise
     */
    public boolean isDateClosed(LocalDate date) {
        if (date == null) {
            return false;
        }
        return closureRepository.existsByClosureDate(date);
    }

    private record FecContext(String jCode, String jLib, String ecritureNum, String dateStr, String pieceRef, String validDate) {}
    private record FecEntry(String compteNum, String compteLib, String libelle, BigDecimal debit, BigDecimal credit) {}

    /**
     * Generates a standard French FEC (Fichier des Écritures Comptables) formatted export
     * for double-entry bookkeeping compliance.
     *
     * @param closureId Closure database ID
     * @return Tab-delimited FEC string
     */
    public String generateFecExport(Long closureId) {
        DailyCashClosure closure = getClosureById(closureId);

        StringBuilder sb = new StringBuilder();
        sb.append("JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tCompteAuxNum\tCompteAuxLib\tPieceRef\tPieceDate\tEcritureLib\tDebit\tCredit\tEcritureLet\tDateLet\tValidDate\tMontantdevise\tIdevise\n");

        String dateStr = closure.getClosureDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        FecContext ctx = new FecContext("CA", "Journal Caisse", closure.getClosureNumber(), dateStr, closure.getClosureNumber(), dateStr);

        appendPaymentModesFec(sb, ctx, closure);
        appendDiscrepancyFec(sb, ctx, closure.getCashDiscrepancy());
        appendVatBreakdownFec(sb, ctx, closure);

        return sb.toString();
    }

    private void appendPaymentModesFec(StringBuilder sb, FecContext ctx, DailyCashClosure closure) {
        List<PaymentModeSummaryDTO> paymentModes = deserializeList(closure.getPaymentMethodsJson(), new TypeReference<>() {});
        for (PaymentModeSummaryDTO pm : paymentModes) {
            String mode = pm.modePaiement() != null ? pm.modePaiement().toUpperCase() : "AUTRE";
            String compteNum = resolveAccountForPaymentMode(mode);
            String compteLib = resolveAccountLabelForPaymentMode(mode);

            appendFecLine(sb, ctx, new FecEntry(compteNum, compteLib,
                    "Encaissement " + mode + " - " + ctx.ecritureNum(), pm.totalTtc(), BigDecimal.ZERO));
        }
    }

    private String resolveAccountForPaymentMode(String mode) {
        return switch (mode) {
            case "ESPECES", "CASH" -> "530000";
            case "CARTE", "CB" -> "512000";
            case "CHECK", "CHEQUE" -> "511200";
            case "AVOIR" -> "419000";
            default -> "580000";
        };
    }

    private String resolveAccountLabelForPaymentMode(String mode) {
        return switch (mode) {
            case "ESPECES", "CASH" -> "Caisse Espèces";
            case "CARTE", "CB" -> "Banque Cartes Bancaires";
            case "CHECK", "CHEQUE" -> "Chèques à encaisser";
            case "AVOIR" -> "Clients - Avoirs et acomptes";
            default -> "Règlements Divers (" + mode + ")";
        };
    }

    private void appendDiscrepancyFec(StringBuilder sb, FecContext ctx, BigDecimal discrepancy) {
        if (discrepancy == null || discrepancy.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        if (discrepancy.compareTo(BigDecimal.ZERO) < 0) {
            appendFecLine(sb, ctx, new FecEntry("658000", "Pertes sur écarts de caisse",
                    "Déficit caisse - " + ctx.ecritureNum(), discrepancy.abs(), BigDecimal.ZERO));
        } else {
            appendFecLine(sb, ctx, new FecEntry("758000", "Produits sur écarts de caisse",
                    "Excédent caisse - " + ctx.ecritureNum(), BigDecimal.ZERO, discrepancy));
        }
    }

    private void appendVatBreakdownFec(StringBuilder sb, FecContext ctx, DailyCashClosure closure) {
        List<VatSummaryDTO> vatList = deserializeList(closure.getVatBreakdownJson(), new TypeReference<>() {});
        for (VatSummaryDTO vat : vatList) {
            if (vat.baseHt() != null && vat.baseHt().compareTo(BigDecimal.ZERO) > 0) {
                appendFecLine(sb, ctx, new FecEntry("706000", "Prestations de services (" + vat.tauxLabel() + ")",
                        "Ventes HT " + vat.tauxLabel() + " - " + ctx.ecritureNum(), BigDecimal.ZERO, vat.baseHt()));
            }
            if (vat.montantTva() != null && vat.montantTva().compareTo(BigDecimal.ZERO) > 0) {
                appendFecLine(sb, ctx, new FecEntry("445710", "TVA collectée (" + vat.tauxLabel() + ")",
                        "TVA collectée " + vat.tauxLabel() + " - " + ctx.ecritureNum(), BigDecimal.ZERO, vat.montantTva()));
            }
        }
    }

    private void appendFecLine(StringBuilder sb, FecContext ctx, FecEntry entry) {
        String debitStr = entry.debit() != null && entry.debit().compareTo(BigDecimal.ZERO) > 0 ? entry.debit().setScale(2).toString() : "";
        String creditStr = entry.credit() != null && entry.credit().compareTo(BigDecimal.ZERO) > 0 ? entry.credit().setScale(2).toString() : "";

        sb.append(ctx.jCode()).append("\t")
                .append(ctx.jLib()).append("\t")
                .append(ctx.ecritureNum()).append("\t")
                .append(ctx.dateStr()).append("\t")
                .append(entry.compteNum()).append("\t")
                .append(entry.compteLib()).append("\t")
                .append("").append("\t")
                .append("").append("\t")
                .append(ctx.pieceRef()).append("\t")
                .append(ctx.dateStr()).append("\t")
                .append(entry.libelle()).append("\t")
                .append(debitStr).append("\t")
                .append(creditStr).append("\t")
                .append("").append("\t")
                .append("").append("\t")
                .append(ctx.validDate()).append("\t")
                .append("").append("\t")
                .append("EUR\n");
    }

    private String computeSha256Seal(DailyCashClosure closure, String operator) {
        String payload = String.format("%s|%s|%s|%s|%s|%s|%s|%s|%s",
                closure.getClosureNumber(),
                closure.getClosureDate(),
                closure.getTotalRevenueTTC() != null ? closure.getTotalRevenueTTC().setScale(2) : "0.00",
                closure.getTotalRevenueHT() != null ? closure.getTotalRevenueHT().setScale(2) : "0.00",
                closure.getOpeningFloat() != null ? closure.getOpeningFloat().setScale(2) : "0.00",
                closure.getTheoreticalCash() != null ? closure.getTheoreticalCash().setScale(2) : "0.00",
                closure.getCountedCash() != null ? closure.getCountedCash().setScale(2) : "0.00",
                closure.getCashDiscrepancy() != null ? closure.getCashDiscrepancy().setScale(2) : "0.00",
                operator != null ? operator : "SYSTEM");

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    private String serializeJson(Object obj) {
        try {
            return obj != null ? objectMapper.writeValueAsString(obj) : "[]";
        } catch (Exception e) {
            log.warn("Failed to serialize object to JSON: {}", e.getMessage());
            return "[]";
        }
    }

    private <T> List<T> deserializeList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            log.warn("Failed to deserialize JSON to list: {}", e.getMessage());
            return List.of();
        }
    }
}
