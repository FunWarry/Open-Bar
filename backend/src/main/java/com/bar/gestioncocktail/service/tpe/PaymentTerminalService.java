package com.bar.gestioncocktail.service.tpe;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TpeTerminalRole;
import com.bar.gestioncocktail.model.TpeTransactionStatus;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

/**
 * Service managing payment terminal (TPE) transactions, station routing,
 * asynchronous STOMP progress broadcasts, simulation mode, and socket life-cycle.
 */
@Service
public class PaymentTerminalService {

    private static final Logger log = LoggerFactory.getLogger(PaymentTerminalService.class);
    private static final String PAYMENTS_TOPIC = "/topic/payments";
    private static final ZoneId SYSTEM_ZONE = ZoneId.systemDefault();

    private final AppSettingsService appSettingsService;
    private final EstablishmentConfigService establishmentConfigService;
    private final ConcertSocketClient concertSocketClient;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, TpePaymentResponseDTO> activeTransactions = new ConcurrentHashMap<>();
    private final Map<String, Boolean> cancelledTransactions = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newCachedThreadPool();
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Constructor injection.
     *
     * @param appSettingsService         Establishment visual and hardware settings service
     * @param establishmentConfigService Modular capability flag verification service
     * @param concertSocketClient        Low-level TCP client for Concert protocol
     * @param messagingTemplate          STOMP message broker template
     */
    public PaymentTerminalService(
            AppSettingsService appSettingsService,
            EstablishmentConfigService establishmentConfigService,
            ConcertSocketClient concertSocketClient,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.appSettingsService = appSettingsService;
        this.establishmentConfigService = establishmentConfigService;
        this.concertSocketClient = concertSocketClient;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Initiates an electronic card payment transaction to a physical or simulated TPE.
     * Starts execution asynchronously and broadcasts progress over STOMP topic {@code /topic/payments}.
     *
     * @param request Payment parameters including amount, currency, and role
     * @return Initial response with tracking transactionId
     */
    public TpePaymentResponseDTO initiatePayment(TpePaymentRequestDTO request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.PAYMENT_TERMINAL);

        AppSettings settings = appSettingsService.getSettings();
        String transactionId = UUID.randomUUID().toString();
        String currencyCode = request.resolveCurrencyCode();
        String terminalId = (settings.getTpeTerminalId() != null && !settings.getTpeTerminalId().isBlank())
                ? settings.getTpeTerminalId().trim()
                : "01";

        TpePaymentResponseDTO initial = TpePaymentResponseDTO.initiated(
                transactionId,
                request.montant(),
                currencyCode,
                terminalId,
                "Transaction dispatched to terminal"
        );
        activeTransactions.put(transactionId, initial);
        cancelledTransactions.put(transactionId, false);

        broadcastStatus(initial);

        boolean isSimulator = Boolean.TRUE.equals(settings.getTpeSimulatorEnabled())
                || "mock".equalsIgnoreCase(request.terminalIp())
                || "127.0.0.1".equals(request.terminalIp());

        if (isSimulator) {
            executorService.submit(() -> runSimulatedPayment(transactionId, request, terminalId, currencyCode));
        } else {
            executorService.submit(() -> runHardwarePayment(transactionId, request, settings, terminalId, currencyCode));
        }

        return initial;
    }

    /**
     * Cancels an ongoing transaction in progress.
     *
     * @param transactionId Target transaction identifier
     * @return Updated response marked as CANCELLED
     */
    public TpePaymentResponseDTO cancelPayment(String transactionId) {
        cancelledTransactions.put(transactionId, true);
        concertSocketClient.abortTransaction(transactionId);

        TpePaymentResponseDTO existing = activeTransactions.get(transactionId);
        BigDecimal amount = (existing != null) ? existing.amount() : BigDecimal.ZERO;
        String currency = (existing != null) ? existing.currencyCode() : "EUR";
        String termId = (existing != null) ? existing.terminalId() : "01";

        TpePaymentResponseDTO cancelled = new TpePaymentResponseDTO(
                transactionId,
                TpeTransactionStatus.CANCELLED,
                amount,
                currency,
                null,
                termId,
                null,
                null,
                null,
                "Transaction cancelled by operator",
                LocalDateTime.now(SYSTEM_ZONE)
        );
        activeTransactions.put(transactionId, cancelled);
        broadcastStatus(cancelled);
        return cancelled;
    }

    /**
     * Retrieves the latest known status of a payment transaction.
     *
     * @param transactionId Target transaction identifier
     * @return Current status DTO
     */
    public TpePaymentResponseDTO getTransactionStatus(String transactionId) {
        TpePaymentResponseDTO dto = activeTransactions.get(transactionId);
        if (dto == null) {
            throw new BusinessException("Transaction not found: " + transactionId);
        }
        return dto;
    }

    /**
     * Tests connectivity to a configured or specified payment terminal.
     *
     * @param request Connection test parameters
     * @return Diagnostic response
     */
    public TpeConnectionTestResponseDTO testConnection(TpeConnectionTestRequestDTO request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.PAYMENT_TERMINAL);
        AppSettings settings = appSettingsService.getSettings();

        if (Boolean.TRUE.equals(settings.getTpeSimulatorEnabled()) || "127.0.0.1".equals(request.ip()) || "mock".equalsIgnoreCase(request.ip())) {
            return new TpeConnectionTestResponseDTO(true, "Simulated TPE terminal reachable (Demo mode)", 14);
        }

        String targetIp = resolveTargetIp(request.role(), request.ip(), settings);
        int targetPort = resolveTargetPort(request.port(), settings.getTpePort());

        if (targetIp == null || targetIp.isBlank()) {
            return new TpeConnectionTestResponseDTO(false, "No terminal IP configured for role " + (request.role() != null ? request.role() : "BAR"), 0);
        }

        try {
            long latency = concertSocketClient.testConnection(targetIp, targetPort, 4000);
            return new TpeConnectionTestResponseDTO(true, "Concert handshake ACK received in " + latency + "ms", latency);
        } catch (Exception e) {
            log.warn("TPE test connection failed for {}:{}", targetIp, targetPort, e);
            return new TpeConnectionTestResponseDTO(false, "Failed to connect to TPE: " + e.getMessage(), 0);
        }
    }

    /**
     * Returns public terminal status and hardware configuration for workstations.
     *
     * @return {@link TpePublicConfigDTO}
     */
    public TpePublicConfigDTO getPublicConfig() {
        boolean moduleActive = establishmentConfigService.isModuleEnabled(EstablishmentModule.PAYMENT_TERMINAL);
        AppSettings settings = appSettingsService.getSettings();

        boolean enabled = moduleActive && Boolean.TRUE.equals(settings.getTpeEnabled());
        boolean sim = Boolean.TRUE.equals(settings.getTpeSimulatorEnabled());
        boolean barConfigured = settings.getTpeBarIp() != null && !settings.getTpeBarIp().isBlank();
        boolean floorConfigured = settings.getTpeFloorIp() != null && !settings.getTpeFloorIp().isBlank();

        return new TpePublicConfigDTO(
                enabled,
                sim,
                barConfigured,
                floorConfigured,
                settings.getTpePort() != null ? settings.getTpePort() : 8888,
                settings.getTpeTerminalId() != null ? settings.getTpeTerminalId() : "01",
                settings.getTpeTimeoutSeconds() != null ? settings.getTpeTimeoutSeconds() : 45,
                settings.getTpeTerminalsJson()
        );
    }

    private void runSimulatedPayment(String transactionId, TpePaymentRequestDTO request, String terminalId, String currencyCode) {
        try {
            // Step 1: Waiting for card presentation
            sleep(500);
            if (isCancelled(transactionId)) return;

            TpePaymentResponseDTO waiting = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.WAITING_CARD,
                    request.montant(),
                    currencyCode,
                    null,
                    terminalId,
                    null,
                    null,
                    null,
                    "Please present or insert card on the terminal...",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeTransactions.put(transactionId, waiting);
            broadcastStatus(waiting);

            // Step 2: Processing PIN / bank authorization
            sleep(900);
            if (isCancelled(transactionId)) return;

            TpePaymentResponseDTO processing = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.PROCESSING,
                    request.montant(),
                    currencyCode,
                    null,
                    terminalId,
                    null,
                    null,
                    null,
                    "Banking authorization in progress...",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeTransactions.put(transactionId, processing);
            broadcastStatus(processing);

            // Step 3: Approved
            sleep(800);
            if (isCancelled(transactionId)) return;

            int randomSeq = 100000 + secureRandom.nextInt(900000);
            String authCode = "AUTH-" + (100000 + secureRandom.nextInt(900000));
            String panLast4 = String.valueOf(1000 + secureRandom.nextInt(9000));

            TpePaymentResponseDTO approved = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.APPROVED,
                    request.montant(),
                    currencyCode,
                    authCode,
                    terminalId,
                    "CB",
                    "************" + panLast4,
                    String.valueOf(randomSeq),
                    "Payment accepted",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeTransactions.put(transactionId, approved);
            broadcastStatus(approved);
        } catch (Exception e) {
            log.error("Simulation error for transaction {}", sanitizeLog(transactionId), e);
            publishError(transactionId, request.montant(), currencyCode, terminalId, "Simulation failed: " + e.getMessage());
        }
    }

    private void runHardwarePayment(
            String transactionId,
            TpePaymentRequestDTO request,
            AppSettings settings,
            String terminalId,
            String currencyCode
    ) {
        try {
            String targetIp = resolveTargetIp(request.resolveRole(), request.terminalIp(), settings);
            int targetPort = resolveTargetPort(request.terminalPort(), settings.getTpePort());
            int timeoutSec = (settings.getTpeTimeoutSeconds() != null) ? settings.getTpeTimeoutSeconds() : 45;

            if (targetIp == null || targetIp.isBlank()) {
                throw new BusinessException("No terminal IP address configured for station " + request.resolveRole());
            }

            // Broadcast waiting for card
            TpePaymentResponseDTO waiting = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.WAITING_CARD,
                    request.montant(),
                    currencyCode,
                    null,
                    terminalId,
                    null,
                    null,
                    null,
                    "Please present or insert card on the terminal...",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeTransactions.put(transactionId, waiting);
            broadcastStatus(waiting);

            long amountCents = request.montant()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValue();

            byte[] requestFrame = ConcertFrameBuilder.buildDebitFrame(
                    terminalId,
                    amountCents,
                    currencyCode,
                    request.reference()
            );

            ConcertFrameBuilder.ConcertResponse response = concertSocketClient.sendDebitTransaction(
                    transactionId,
                    targetIp,
                    targetPort,
                    timeoutSec,
                    requestFrame
            );

            if (isCancelled(transactionId)) return;

            TpePaymentResponseDTO finalResult = new TpePaymentResponseDTO(
                    transactionId,
                    response.status(),
                    request.montant(),
                    currencyCode,
                    response.authorizationCode(),
                    terminalId,
                    response.cardBrand() != null ? response.cardBrand() : "CB",
                    response.maskedPan(),
                    response.sequenceNumber(),
                    response.status() == TpeTransactionStatus.APPROVED ? "Payment accepted" : "Transaction declined",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeTransactions.put(transactionId, finalResult);
            broadcastStatus(finalResult);
        } catch (Exception e) {
            log.error("Hardware execution error for transaction {}", sanitizeLog(transactionId), e);
            publishError(transactionId, request.montant(), currencyCode, terminalId, e.getMessage());
        }
    }

    private void publishError(String transactionId, BigDecimal amount, String currency, String terminalId, String message) {
        TpePaymentResponseDTO error = new TpePaymentResponseDTO(
                transactionId,
                TpeTransactionStatus.ERROR,
                amount,
                currency,
                null,
                terminalId,
                null,
                null,
                null,
                message,
                LocalDateTime.now(SYSTEM_ZONE)
        );
        activeTransactions.put(transactionId, error);
        broadcastStatus(error);
    }

    private int resolveTargetPort(Integer requestPort, Integer settingsPort) {
        if (requestPort != null && requestPort > 0) {
            return requestPort;
        }
        if (settingsPort != null && settingsPort > 0) {
            return settingsPort;
        }
        return 8888;
    }

    private String resolveTargetIp(TpeTerminalRole role, String manualIp, AppSettings settings) {
        if (manualIp != null && !manualIp.isBlank()) {
            return manualIp.trim();
        }
        if (role == TpeTerminalRole.FLOOR) {
            return (settings.getTpeFloorIp() != null && !settings.getTpeFloorIp().isBlank())
                    ? settings.getTpeFloorIp().trim()
                    : settings.getTpeBarIp();
        }
        return (settings.getTpeBarIp() != null) ? settings.getTpeBarIp().trim() : null;
    }

    private boolean isCancelled(String transactionId) {
        return Boolean.TRUE.equals(cancelledTransactions.get(transactionId));
    }

    private void broadcastStatus(TpePaymentResponseDTO dto) {
        try {
            messagingTemplate.convertAndSend(PAYMENTS_TOPIC, dto);
        } catch (Exception e) {
            log.warn("Failed to broadcast TPE status event over STOMP: {}", e.getMessage());
        }
    }

    private static String sanitizeLog(String input) {
        if (input == null) {
            return "";
        }
        return input.replaceAll("[^a-zA-Z0-9_.-]", "");
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
        }
    }
}
