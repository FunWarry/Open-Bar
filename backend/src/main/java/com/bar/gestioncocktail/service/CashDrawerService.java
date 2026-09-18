package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CashDrawerOpenRequestDTO;
import com.bar.gestioncocktail.dto.CashDrawerSessionDTO;
import com.bar.gestioncocktail.dto.CashDrawerStatusDTO;
import com.bar.gestioncocktail.dto.CashMovementDTO;
import com.bar.gestioncocktail.dto.CashMovementRequestDTO;
import com.bar.gestioncocktail.dto.DailyRecapDTO;
import com.bar.gestioncocktail.dto.PaymentModeSummaryDTO;
import com.bar.gestioncocktail.dto.XReportDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.CashDrawerSession;
import com.bar.gestioncocktail.model.CashDrawerSessionStatus;
import com.bar.gestioncocktail.model.CashMovement;
import com.bar.gestioncocktail.model.CashMovementType;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CashDrawerSessionRepository;
import com.bar.gestioncocktail.repository.CashMovementRepository;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service managing the physical cash drawer lifecycle:
 * morning till opening with counted float, intra-day cash movements (in/drop/paid out),
 * intermediate X-reports, liquidity controls, and settlement validations.
 */
@Service
@Transactional(readOnly = true)
public class CashDrawerService {

    private static final Logger log = LoggerFactory.getLogger(CashDrawerService.class);
    private static final String PAYMENT_MODE_ESPECES = "ESPECES";
    private static final String PAYMENT_MODE_CASH = "CASH";
    private static final String ENTITY_CASH_DRAWER = "CASH_DRAWER";
    private static final String ENTITY_CASH_MOVEMENT = "CASH_MOVEMENT";

    private final CashDrawerSessionRepository sessionRepository;
    private final CashMovementRepository movementRepository;
    private final DailyCashClosureRepository closureRepository;
    private final FactureService factureService;
    private final UserRepository userRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final TimeService timeService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<EscPosPrintingService> printingServiceProvider;

    /**
     * Constructs the cash drawer service with required repositories and collaborators.
     *
     * @param sessionRepository Cash drawer session repository
     * @param movementRepository Cash movement repository
     * @param closureRepository Daily cash register closure repository
     * @param factureService Invoicing and daily financial aggregation service
     * @param userRepository User repository for resolving operators
     * @param establishmentConfigService Establishment settings and module feature flags
     * @param timeService Establishment timezone and time provider
     * @param auditLogService Security and business audit logging service
     * @param objectMapper JSON serializer for breakdown structures
     * @param printingServiceProvider Optional provider for ESC/POS ticket printing
     */
    public CashDrawerService(
            CashDrawerSessionRepository sessionRepository,
            CashMovementRepository movementRepository,
            DailyCashClosureRepository closureRepository,
            FactureService factureService,
            UserRepository userRepository,
            EstablishmentConfigService establishmentConfigService,
            TimeService timeService,
            AuditLogService auditLogService,
            ObjectMapper objectMapper,
            ObjectProvider<EscPosPrintingService> printingServiceProvider) {
        this.sessionRepository = sessionRepository;
        this.movementRepository = movementRepository;
        this.closureRepository = closureRepository;
        this.factureService = factureService;
        this.userRepository = userRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.timeService = timeService;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.printingServiceProvider = printingServiceProvider;
    }

    /**
     * Retrieves the current cash drawer status and liquidity overview for an operational date.
     *
     * @param targetDate Operational date (defaults to today if null)
     * @return Real-time status DTO
     */
    public CashDrawerStatusDTO getStatus(LocalDate targetDate) {
        LocalDate date = resolveDate(targetDate);
        Optional<CashDrawerSession> openSessionOpt = sessionRepository.findBySessionDateAndStatus(date, CashDrawerSessionStatus.OPEN);
        CashDrawerSession currentSession = openSessionOpt
                .or(() -> sessionRepository.findBySessionDateOrderByOpenedAtDesc(date).stream().findFirst())
                .orElse(null);

        boolean isOpened = openSessionOpt.isPresent();
        BigDecimal openingFloat = currentSession != null ? currentSession.getOpeningFloat() : BigDecimal.ZERO;

        DailyRecapDTO recap = factureService.getDailyRecap(date);
        BigDecimal totalCashRevenue = calculateCashPayments(recap);

        List<CashMovement> movements = movementRepository.findByMovementDateOrderByTimestampAsc(date);
        BigDecimal totalCashIn = sumMovements(movements, CashMovementType.CASH_IN);
        BigDecimal totalCashDrop = sumMovements(movements, CashMovementType.CASH_DROP);
        BigDecimal totalPaidOut = sumMovements(movements, CashMovementType.PAID_OUT);

        BigDecimal currentTheoreticalCash = openingFloat
                .add(totalCashRevenue)
                .add(totalCashIn)
                .subtract(totalCashDrop)
                .subtract(totalPaidOut);

        return new CashDrawerStatusDTO(
                isOpened,
                CashDrawerSessionDTO.from(currentSession),
                openingFloat,
                totalCashRevenue,
                totalCashIn,
                totalCashDrop,
                totalPaidOut,
                currentTheoreticalCash,
                movements.size()
        );
    }

    /**
     * Opens the physical cash drawer register for the day with a counted starting float.
     *
     * @param request Opening parameters and denomination breakdown
     * @param operatorUsername Username of the staff member opening the till
     * @return Created and persisted {@link CashDrawerSessionDTO}
     */
    @Transactional
    public CashDrawerSessionDTO openDrawer(CashDrawerOpenRequestDTO request, String operatorUsername) {
        validateModuleEnabled();
        LocalDate date = LocalDate.now(timeService.getZoneId());

        if (closureRepository.existsByClosureDate(date)) {
            throw new BusinessException("Cannot open cash drawer for a date whose register is already closed: " + date);
        }

        if (sessionRepository.existsBySessionDateAndStatus(date, CashDrawerSessionStatus.OPEN)) {
            throw new BusinessException("A cash drawer session is already open for today: " + date);
        }

        User operator = resolveUser(operatorUsername);
        String breakdownJson = serializeJsonSafely(request.breakdown());

        CashDrawerSession session = new CashDrawerSession();
        session.setSessionDate(date);
        session.setStatus(CashDrawerSessionStatus.OPEN);
        session.setOpenedAt(LocalDateTime.now(timeService.getZoneId()));
        session.setOpenedBy(operator);
        session.setOpeningFloat(request.openingFloat() != null ? request.openingFloat() : BigDecimal.ZERO);
        session.setOpeningFloatBreakdownJson(breakdownJson);
        session.setNotes(request.notes() != null ? request.notes().trim() : null);

        CashDrawerSession saved = sessionRepository.save(session);
        log.info("Cash drawer opened successfully for date {} by {} with float {}", date, operatorUsername, saved.getOpeningFloat());

        auditLogService.logAction(operator, "OPEN_CASH_DRAWER", ENTITY_CASH_DRAWER, saved.getId(),
                "Till opened for " + date + " with float " + saved.getOpeningFloat() + " €", null);

        dispatchTillOpeningPrintSafely(saved.getId());

        return CashDrawerSessionDTO.from(saved);
    }

    /**
     * Logs an intra-day cash movement (Cash In, Cash Drop, or Paid Out) within the open drawer session.
     *
     * @param request Movement specifications
     * @param operatorUsername Staff member performing the action
     * @return Created {@link CashMovementDTO}
     */
    @Transactional
    public CashMovementDTO recordMovement(CashMovementRequestDTO request, String operatorUsername) {
        validateModuleEnabled();
        LocalDate date = LocalDate.now(timeService.getZoneId());

        if (closureRepository.existsByClosureDate(date)) {
            throw new BusinessException("Cannot record cash movement for a date whose register is already closed: " + date);
        }

        CashDrawerSession session = sessionRepository.findBySessionDateAndStatus(date, CashDrawerSessionStatus.OPEN)
                .orElseThrow(() -> new BusinessException("No active cash drawer session is open for today. Please open the till before recording cash movements."));

        User operator = resolveUser(operatorUsername);

        if (request.type() == CashMovementType.CASH_DROP || request.type() == CashMovementType.PAID_OUT) {
            CashDrawerStatusDTO currentStatus = getStatus(date);
            if (request.amount().compareTo(currentStatus.currentTheoreticalCash()) > 0) {
                throw new BusinessException(String.format(
                        "Cannot withdraw %s €: theoretical cash in drawer is currently %s €",
                        request.amount(), currentStatus.currentTheoreticalCash()
                ));
            }
        }

        CashMovement movement = new CashMovement();
        movement.setSession(session);
        movement.setMovementDate(date);
        movement.setType(request.type());
        movement.setAmount(request.amount());
        movement.setReason(request.reason().trim());
        movement.setReceiptReference(request.receiptReference() != null ? request.receiptReference().trim() : null);
        movement.setPerformedBy(operator);
        movement.setTimestamp(LocalDateTime.now(timeService.getZoneId()));

        CashMovement saved = movementRepository.save(movement);
        log.info("Cash movement recorded: Type={}, Amount={}, Reason={}, User={}",
                saved.getType(), saved.getAmount(), saved.getReason(), operatorUsername);

        auditLogService.logAction(operator, "CASH_MOVEMENT_" + saved.getType(), ENTITY_CASH_MOVEMENT, saved.getId(),
                saved.getType() + " " + saved.getAmount() + " € (" + saved.getReason() + ")", null);

        dispatchCashMovementPrintSafely(saved.getId());

        return CashMovementDTO.from(saved);
    }

    /**
     * Lists all intra-day cash movements logged for a given date.
     *
     * @param targetDate Operational date (defaults to today if null)
     * @return List of cash movement DTOs
     */
    public List<CashMovementDTO> getMovements(LocalDate targetDate) {
        LocalDate date = resolveDate(targetDate);
        return movementRepository.findByMovementDateOrderByTimestampAsc(date)
                .stream()
                .map(CashMovementDTO::from)
                .toList();
    }

    /**
     * Generates a non-destructive intermediate X-Report for an operational day.
     *
     * @param targetDate Operational date
     * @param operatorUsername Requesting user
     * @return Certified X-Report snapshot DTO
     */
    public XReportDTO getXReport(LocalDate targetDate, String operatorUsername) {
        LocalDate date = resolveDate(targetDate);
        CashDrawerSession currentSession = sessionRepository.findBySessionDateAndStatus(date, CashDrawerSessionStatus.OPEN)
                .or(() -> sessionRepository.findBySessionDateOrderByOpenedAtDesc(date).stream().findFirst())
                .orElse(null);

        DailyRecapDTO recap = factureService.getDailyRecap(date);
        BigDecimal totalCashRevenue = calculateCashPayments(recap);

        List<CashMovement> movements = movementRepository.findByMovementDateOrderByTimestampAsc(date);
        BigDecimal totalCashIn = sumMovements(movements, CashMovementType.CASH_IN);
        BigDecimal totalCashDrop = sumMovements(movements, CashMovementType.CASH_DROP);
        BigDecimal totalPaidOut = sumMovements(movements, CashMovementType.PAID_OUT);

        BigDecimal openingFloat = currentSession != null ? currentSession.getOpeningFloat() : BigDecimal.ZERO;
        BigDecimal theoreticalCashInDrawer = openingFloat
                .add(totalCashRevenue)
                .add(totalCashIn)
                .subtract(totalCashDrop)
                .subtract(totalPaidOut);

        List<CashMovementDTO> movementDTOs = movements.stream().map(CashMovementDTO::from).toList();

        return new XReportDTO(
                date,
                LocalDateTime.now(timeService.getZoneId()),
                operatorUsername != null ? operatorUsername : "SYSTEM",
                CashDrawerSessionDTO.from(currentSession),
                recap.totalCaHt(),
                recap.totalCaTtc(),
                recap.ventilationModePaiement(),
                recap.ventilationTva(),
                openingFloat,
                totalCashRevenue,
                totalCashIn,
                totalCashDrop,
                totalPaidOut,
                theoreticalCashInDrawer,
                movementDTOs
        );
    }

    /**
     * Checks if the physical cash drawer till is currently opened for transactions on a given date.
     * Always returns true if the {@link EstablishmentModule#CASH_DRAWER} capability is disabled.
     *
     * @param date Operational date
     * @return True if till is opened (or module disabled), false if cash settlement must be blocked
     */
    public boolean isTillOpenedForDate(LocalDate date) {
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.CASH_DRAWER)) {
            return true;
        }
        LocalDate d = resolveDate(date);
        return sessionRepository.existsBySessionDateAndStatus(d, CashDrawerSessionStatus.OPEN);
    }

    /**
     * Closes an active cash drawer session upon official register daily closure (Z-Report).
     *
     * @param date Operational date
     * @param operator User executing the daily closure
     */
    @Transactional
    public void closeActiveSessionOnDailyClosure(LocalDate date, User operator) {
        LocalDate d = resolveDate(date);
        Optional<CashDrawerSession> openSession = sessionRepository.findBySessionDateAndStatus(d, CashDrawerSessionStatus.OPEN);
        if (openSession.isPresent()) {
            CashDrawerSession session = openSession.get();
            session.setStatus(CashDrawerSessionStatus.CLOSED);
            session.setClosedAt(LocalDateTime.now(timeService.getZoneId()));
            session.setClosedBy(operator);
            sessionRepository.save(session);
            log.info("Closed cash drawer session {} for date {}", session.getId(), d);
        }
    }

    /**
     * Resolves an operational date, falling back to current local establishment date if null.
     */
    public LocalDate resolveDate(LocalDate date) {
        return date != null ? date : LocalDate.now(timeService.getZoneId());
    }

    private void validateModuleEnabled() {
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.CASH_DRAWER)) {
            throw new BusinessException("Cash drawer management module is disabled for this establishment");
        }
    }

    private User resolveUser(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    private BigDecimal calculateCashPayments(DailyRecapDTO recap) {
        if (recap == null || recap.ventilationModePaiement() == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal sum = BigDecimal.ZERO;
        for (PaymentModeSummaryDTO pm : recap.ventilationModePaiement()) {
            if (PAYMENT_MODE_ESPECES.equalsIgnoreCase(pm.modePaiement()) || PAYMENT_MODE_CASH.equalsIgnoreCase(pm.modePaiement())) {
                sum = sum.add(pm.totalTtc());
            }
        }
        return sum;
    }

    private BigDecimal sumMovements(List<CashMovement> movements, CashMovementType type) {
        if (movements == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (CashMovement m : movements) {
            if (m != null && m.getType() == type && m.getAmount() != null) {
                total = total.add(m.getAmount());
            }
        }
        return total;
    }

    private String serializeJsonSafely(Object object) {
        if (object == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize cash drawer JSON payload: {}", e.getMessage());
            return null;
        }
    }

    private void dispatchTillOpeningPrintSafely(Long sessionId) {
        EscPosPrintingService printer = printingServiceProvider.getIfAvailable();
        if (printer != null) {
            try {
                printer.printTillOpeningSlip(sessionId);
            } catch (Exception ex) {
                log.warn("Automatic print of till opening slip failed: {}", ex.getMessage());
            }
        }
    }

    private void dispatchCashMovementPrintSafely(Long movementId) {
        EscPosPrintingService printer = printingServiceProvider.getIfAvailable();
        if (printer != null) {
            try {
                printer.printCashMovementSlip(movementId);
            } catch (Exception ex) {
                log.warn("Automatic print of cash movement slip failed: {}", ex.getMessage());
            }
        }
    }
}
