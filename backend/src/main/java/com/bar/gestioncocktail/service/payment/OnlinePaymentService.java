package com.bar.gestioncocktail.service.payment;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.FactureReglementRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.OnlinePaymentTransactionRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service managing end-to-end pay-at-table patron direct mobile settlements.
 * Coordinates payment gateway providers (Stripe Elements / Sandbox simulator),
 * table additions, split bill tracking, idempotency, legal invoice generation,
 * receipt dispatch, and table liberation.
 */
@Service
public class OnlinePaymentService {

    private static final Logger log = LoggerFactory.getLogger(OnlinePaymentService.class);
    private static final String PAYMENT_METHOD_ONLINE = "CARTE_EN_LIGNE";
    private static final BigDecimal EPSILON = new BigDecimal("0.05");

    /** Identifier for Stripe provider. */
    public static final String STRIPE_PROVIDER = "STRIPE";

    /** Transaction status for successful settlement. */
    public static final String STATUS_SUCCEEDED = "SUCCEEDED";

    private static final String ERR_TABLE_NOT_FOUND = "Table not found: ";
    private static final String ERR_TRANSACTION_NOT_FOUND = "Transaction not found: ";

    private final OnlinePaymentTransactionRepository transactionRepository;
    private final TableRepository tableRepository;
    private final FactureRepository factureRepository;
    private final FactureReglementRepository reglementRepository;
    private final FactureService factureService;
    private final PdfService pdfService;
    private final EmailReceiptService emailReceiptService;
    private final StripePaymentProvider stripePaymentProvider;
    private final SandboxPaymentProvider sandboxPaymentProvider;
    private final EstablishmentConfigService establishmentConfigService;
    private final AppSettingsService appSettingsService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Constructor injection.
     */
    public OnlinePaymentService(
            OnlinePaymentTransactionRepository transactionRepository,
            TableRepository tableRepository,
            FactureRepository factureRepository,
            FactureReglementRepository reglementRepository,
            FactureService factureService,
            PdfService pdfService,
            EmailReceiptService emailReceiptService,
            StripePaymentProvider stripePaymentProvider,
            SandboxPaymentProvider sandboxPaymentProvider,
            EstablishmentConfigService establishmentConfigService,
            AppSettingsService appSettingsService,
            NotificationService notificationService,
            AuditLogService auditLogService,
            ApplicationEventPublisher eventPublisher
    ) {
        this.transactionRepository = transactionRepository;
        this.tableRepository = tableRepository;
        this.factureRepository = factureRepository;
        this.reglementRepository = reglementRepository;
        this.factureService = factureService;
        this.pdfService = pdfService;
        this.emailReceiptService = emailReceiptService;
        this.stripePaymentProvider = stripePaymentProvider;
        this.sandboxPaymentProvider = sandboxPaymentProvider;
        this.establishmentConfigService = establishmentConfigService;
        this.appSettingsService = appSettingsService;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Resolves the active payment gateway provider (Stripe if keys present and enabled, else Sandbox).
     *
     * @return Active payment gateway provider
     */
    public PaymentGatewayProvider resolveProvider() {
        AppSettings settings = appSettingsService.getSettings();
        String preferred = settings.getOnlinePaymentProvider();
        if (STRIPE_PROVIDER.equalsIgnoreCase(preferred) && stripePaymentProvider.isAvailable()) {
            return stripePaymentProvider;
        }
        return sandboxPaymentProvider;
    }

    /**
     * Retrieves a live bill breakdown and settlement summary for table patrons.
     *
     * @param tableId Scanned table ID
     * @param guestName Optional calling patron nickname
     * @return Live bill breakdown DTO
     */
    @Transactional(readOnly = true)
    public TableBillSummaryResponseDTO getTableBillSummary(Long tableId, String guestName) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException(ERR_TABLE_NOT_FOUND + tableId));
        return internalGetTableBillSummary(table, tableId, guestName);
    }

    private TableBillSummaryResponseDTO internalGetTableBillSummary(TableEntity table, Long tableId, String guestName) {
        boolean moduleEnabled = establishmentConfigService.isModuleEnabled(EstablishmentModule.QR_PAY_AT_TABLE);

        TableAdditionResponseDTO addition = factureService.getTableAddition(tableId);
        List<TableAdditionItemDTO> items = addition.items() != null ? addition.items() : List.of();

        BigDecimal totalTTC = addition.totalTTC() != null ? addition.totalTTC() : BigDecimal.ZERO;
        BigDecimal totalHT = addition.totalHT() != null ? addition.totalHT() : BigDecimal.ZERO;
        BigDecimal totalVAT = addition.totalVAT() != null ? addition.totalVAT() : BigDecimal.ZERO;

        List<FactureReglementDTO> reglements = addition.existingFactureId() != null
                ? factureService.getReglementsByFactureId(addition.existingFactureId())
                : List.of();
        BigDecimal alreadyPaidAmount = calculateAlreadyPaid(reglements);

        BigDecimal remainingBalance = totalTTC.subtract(alreadyPaidAmount).max(BigDecimal.ZERO);
        boolean isFullySettled = totalTTC.compareTo(BigDecimal.ZERO) > 0 && remainingBalance.compareTo(EPSILON) <= 0;

        List<TableAdditionItemDTO> myConsumptions = extractGuestConsumptions(items, guestName);
        BigDecimal mySubTotal = calculateItemsSubtotal(myConsumptions);

        PaymentGatewayProvider provider = resolveProvider();
        AppSettings settings = appSettingsService.getSettings();

        return new TableBillSummaryResponseDTO(
                table.getId(),
                table.getNumero(),
                addition.commandeIds() != null ? addition.commandeIds().size() : 0,
                items,
                totalHT,
                totalVAT,
                totalTTC,
                alreadyPaidAmount,
                remainingBalance,
                isFullySettled,
                reglements,
                myConsumptions,
                mySubTotal,
                moduleEnabled,
                provider.getProviderName(),
                STRIPE_PROVIDER.equalsIgnoreCase(provider.getProviderName()) ? settings.getStripePublishableKey() : null
        );
    }

    private BigDecimal calculateAlreadyPaid(List<FactureReglementDTO> reglements) {
        BigDecimal total = BigDecimal.ZERO;
        if (reglements == null) {
            return total;
        }
        for (FactureReglementDTO r : reglements) {
            if (r.montant() != null) {
                total = total.add(r.montant());
            }
        }
        return total;
    }

    private List<TableAdditionItemDTO> extractGuestConsumptions(List<TableAdditionItemDTO> items, String guestName) {
        List<TableAdditionItemDTO> guestItems = new ArrayList<>();
        if (guestName == null || guestName.isBlank() || items == null) {
            return guestItems;
        }
        String cleanName = guestName.trim().toLowerCase();
        for (TableAdditionItemDTO item : items) {
            if (matchesGuest(item, cleanName)) {
                guestItems.add(item);
            }
        }
        return guestItems;
    }

    private BigDecimal calculateItemsSubtotal(List<TableAdditionItemDTO> items) {
        BigDecimal total = BigDecimal.ZERO;
        for (TableAdditionItemDTO item : items) {
            if (item.total() != null) {
                total = total.add(item.total());
            }
        }
        return total;
    }

    private boolean matchesGuest(TableAdditionItemDTO item, String targetGuestName) {
        return item != null && item.cocktailNom() != null &&
                item.cocktailNom().toLowerCase().contains("[" + targetGuestName + "]");
    }

    /**
     * Creates an online payment intent for a full table settlement or split share.
     * Checks idempotency, calculates remaining balance, verifies business rules,
     * calls the payment gateway provider, and persists a pending transaction.
     *
     * @param tableId Scanned physical table ID
     * @param request Payment intent parameters
     * @return Prepared payment intent response
     */
    @Transactional
    public PaymentIntentResponseDTO createPaymentIntent(Long tableId, PaymentIntentRequestDTO request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.QR_PAY_AT_TABLE);

        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException(ERR_TABLE_NOT_FOUND + tableId));

        // Idempotency check: if intent already exists with this key, return it
        Optional<OnlinePaymentTransaction> existing = transactionRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            OnlinePaymentTransaction tx = existing.get();
            log.info("Idempotent hit for transaction {} with key {}", tx.getTransactionId(), request.idempotencyKey());
            return new PaymentIntentResponseDTO(
                    tx.getTransactionId(),
                    tx.getClientSecret(),
                    tx.getAmount(),
                    tx.getTip(),
                    tx.getTotalCharged(),
                    tx.getCurrency(),
                    tx.getProvider(),
                    STRIPE_PROVIDER.equalsIgnoreCase(tx.getProvider()) ? appSettingsService.getSettings().getStripePublishableKey() : null
            );
        }

        // Live addition check
        TableBillSummaryResponseDTO billSummary = internalGetTableBillSummary(table, tableId, request.guestName());
        if (billSummary.totalTTC().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("No active items on bill for table " + table.getNumero());
        }
        if (billSummary.isFullySettled()) {
            throw new BusinessException("Table " + table.getNumero() + " addition is already fully settled.");
        }

        BigDecimal requestedAmount = request.amount();
        BigDecimal remaining = billSummary.remainingBalance();

        // Enforce server-side security: requested amount cannot exceed remaining balance
        if (requestedAmount.compareTo(remaining.add(EPSILON)) > 0) {
            throw new BusinessException(
                    "Requested amount (" + requestedAmount + " €) exceeds remaining table balance (" + remaining + " €)"
            );
        }

        BigDecimal safeTip = request.tip() != null ? request.tip() : BigDecimal.ZERO;
        BigDecimal totalCharged = requestedAmount.add(safeTip);

        AppSettings settings = appSettingsService.getSettings();
        String currency = settings.getOnlinePaymentCurrency() != null ? settings.getOnlinePaymentCurrency() : "EUR";

        PaymentGatewayProvider provider = resolveProvider();

        PaymentIntentResult result = provider.createPaymentIntent(
                tableId,
                requestedAmount,
                safeTip,
                currency,
                request.idempotencyKey(),
                request.guestName(),
                request.typeSplit()
        );

        // Ensure pending invoice exists
        FactureResponseDTO pendingInvoice = factureService.genererFactureTable(tableId);
        Facture facture = factureRepository.findById(pendingInvoice.id()).orElse(null);

        OnlinePaymentTransaction transaction = new OnlinePaymentTransaction();
        transaction.setTransactionId(result.transactionId());
        transaction.setTable(table);
        transaction.setFacture(facture);
        transaction.setGuestName(request.guestName() != null && !request.guestName().isBlank() ? request.guestName().trim() : "Client QR");
        transaction.setAmount(requestedAmount);
        transaction.setTip(safeTip);
        transaction.setTotalCharged(totalCharged);
        transaction.setCurrency(result.currency());
        transaction.setProvider(result.provider());
        transaction.setStatus("PENDING");
        transaction.setIdempotencyKey(request.idempotencyKey());
        transaction.setCustomerEmail(request.customerEmail());
        transaction.setClientSecret(result.clientSecret());
        transaction.setItemsJson(request.itemsJson());
        transaction.setTypeSplit(request.typeSplit() != null ? request.typeSplit() : "TOTALITE");
        transaction.setLiberateTableRequested(Boolean.TRUE.equals(request.liberateTable()));

        transactionRepository.save(transaction);

        return new PaymentIntentResponseDTO(
                result.transactionId(),
                result.clientSecret(),
                requestedAmount,
                safeTip,
                totalCharged,
                result.currency(),
                result.provider(),
                result.publishableKey()
        );
    }

    /**
     * Confirms and settles a sandbox simulated payment.
     *
     * @param tableId Scanned table ID
     * @param request Sandbox confirmation parameters
     * @return Payment success confirmation DTO
     */
    @Transactional
    public PaymentSuccessResponseDTO confirmSandboxPayment(Long tableId, ConfirmSandboxPaymentRequestDTO request) {
        OnlinePaymentTransaction transaction = transactionRepository.findByTransactionId(request.transactionId())
                .orElseThrow(() -> new ResourceNotFoundException(ERR_TRANSACTION_NOT_FOUND + request.transactionId()));

        if (!transaction.getTable().getId().equals(tableId)) {
            throw new BusinessException("Transaction does not belong to table " + tableId);
        }

        if (transaction.getClientSecret() != null && !transaction.getClientSecret().equals(request.clientSecret())) {
            throw new BusinessException("Invalid client secret for transaction confirmation.");
        }

        String paymentMethod = request.paymentMethodType() != null && !request.paymentMethodType().isBlank()
                ? request.paymentMethodType()
                : "card";

        return internalFinalizePaymentSuccess(transaction, paymentMethod);
    }

    /**
     * Processes an incoming Stripe webhook event.
     *
     * @param payload Raw JSON body
     * @param signatureHeader Stripe-Signature header
     * @return Verified webhook outcome
     */
    @Transactional
    public PaymentWebhookResult handleStripeWebhook(String payload, String signatureHeader) {
        PaymentWebhookResult result = stripePaymentProvider.parseAndVerifyWebhook(payload, signatureHeader);

        if (STATUS_SUCCEEDED.equals(result.status()) && result.transactionId() != null) {
            Optional<OnlinePaymentTransaction> txOpt = transactionRepository.findByTransactionId(result.transactionId());
            if (txOpt.isPresent()) {
                OnlinePaymentTransaction tx = txOpt.get();
                if (result.customerEmail() != null && !result.customerEmail().isBlank()) {
                    tx.setCustomerEmail(result.customerEmail());
                }
                internalFinalizePaymentSuccess(tx, result.paymentMethodType() != null ? result.paymentMethodType() : "card");
            } else {
                log.warn("Received successful Stripe webhook for unknown transaction {}", result.transactionId());
            }
        }

        return result;
    }

    /**
     * Finalizes and records an online payment settlement in the database.
     * Concurrency-safe: if transaction was already marked SUCCEEDED, returns existing state.
     *
     * @param transaction The target transaction entity
     * @param paymentMethodType Payment method used ('card', 'apple_pay', 'google_pay')
     * @return Payment success response
     */
    @Transactional
    public synchronized PaymentSuccessResponseDTO finalizePaymentSuccess(
            OnlinePaymentTransaction transaction,
            String paymentMethodType
    ) {
        return internalFinalizePaymentSuccess(transaction, paymentMethodType);
    }

    private synchronized PaymentSuccessResponseDTO internalFinalizePaymentSuccess(
            OnlinePaymentTransaction transaction,
            String paymentMethodType
    ) {
        if (STATUS_SUCCEEDED.equalsIgnoreCase(transaction.getStatus())) {
            log.info("Transaction {} already settled. Returning idempotent success.", transaction.getTransactionId());
            return buildSuccessDTO(transaction);
        }

        TableEntity table = transaction.getTable();
        Long tableId = table.getId();

        // Ensure invoice exists
        Facture facture = transaction.getFacture();
        if (facture == null || facture.isReglee()) {
            FactureResponseDTO pendingInvoice = factureService.genererFactureTable(tableId);
            facture = factureRepository.findById(pendingInvoice.id()).orElse(null);
            transaction.setFacture(facture);
        }

        if (facture == null) {
            throw new BusinessException("Unable to find or create pending invoice for table " + table.getNumero());
        }

        // Record split share settlement via FactureService
        List<FactureReglement> existingReglements = reglementRepository.findByFactureIdOrderByIdAsc(facture.getId());
        int nextPartIndex = existingReglements.size() + 1;

        EncaisserPartRequest partRequest = new EncaisserPartRequest(
                transaction.getGuestName() != null ? transaction.getGuestName() : "Client QR",
                nextPartIndex,
                nextPartIndex,
                transaction.getAmount(),
                transaction.getTip(),
                transaction.getTotalCharged(),
                PAYMENT_METHOD_ONLINE,
                transaction.getTypeSplit() != null ? transaction.getTypeSplit() : "TOTALITE",
                null, // items will be read from json
                transaction.getTransactionId(),
                "ONLINE_GATEWAY",
                paymentMethodType,
                "**** ONLINE",
                transaction.getTransactionId()
        );

        FactureReglementDTO reglementDTO = factureService.encaisserPart(facture.getId(), partRequest);
        FactureReglement reglement = reglementRepository.findById(reglementDTO.id()).orElse(null);

        transaction.setReglement(reglement);
        transaction.setStatus(STATUS_SUCCEEDED);
        transaction.setPaymentMethodType(paymentMethodType);
        transaction.setReceiptUrl("/api/public/tables/" + tableId + "/payments/" + transaction.getTransactionId() + "/receipt.pdf");
        transactionRepository.save(transaction);

        // Check if full table bill is now settled
        TableBillSummaryResponseDTO billSummary = internalGetTableBillSummary(table, tableId, null);
        boolean isFullySettled = billSummary.isFullySettled();

        // Liberate table if full settlement reached and patron requested departure
        if (isFullySettled && Boolean.TRUE.equals(transaction.getLiberateTableRequested())) {
            executeTableLiberation(table);
        }

        // Audit log
        auditLogService.logAction(
                null,
                "ONLINE_PAYMENT_SUCCESS",
                "Facture",
                facture.getId(),
                "Table " + table.getNumero() + " mobile settlement: " + transaction.getTotalCharged() + " " + transaction.getCurrency()
                        + " (Split: " + transaction.getTypeSplit() + ")",
                null
        );

        // Broadcast real-time updates to waitstaff and patrons
        publishPaymentNotifications(table, billSummary);

        // Auto-send digital email receipt if customer email was provided
        if (transaction.getCustomerEmail() != null && !transaction.getCustomerEmail().isBlank()) {
            internalSendReceiptEmail(transaction, transaction.getCustomerEmail());
        }

        return buildSuccessDTO(transaction);
    }

    private void publishPaymentNotifications(
            TableEntity table,
            TableBillSummaryResponseDTO billSummary
    ) {
        try {
            // Broadcast live bill state to all companions at the same table
            notificationService.notifierParametresMisAJour(billSummary);

            // Broadcast table state update to waitstaff floor plan
            notificationService.notifierChangementTable(table);
        } catch (Exception e) {
            log.warn("Failed broadcasting payment STOMP updates for table {}: {}", table.getId(), e.getMessage());
        }
    }

    private boolean executeTableLiberation(TableEntity table) {
        table.setOccupee(false);
        table.setServeurId(null);
        table.setDateLiberation(LocalDateTime.now(ZoneId.systemDefault()));
        tableRepository.save(table);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.bar.gestioncocktail.event.TableLiberatedEvent(table));
        }
        log.info("Table {} liberated following patron online mobile checkout.", table.getNumero());
        return true;
    }

    /**
     * Executes table liberation when requested by the patron after 100% bill settlement.
     *
     * @param tableId Scanned table ID
     * @return True if table was liberated
     */
    @Transactional
    public boolean liberateTableIfSettled(Long tableId) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException(ERR_TABLE_NOT_FOUND + tableId));

        TableBillSummaryResponseDTO bill = internalGetTableBillSummary(table, tableId, null);
        if (!bill.isFullySettled()) {
            throw new BusinessException("Cannot liberate table " + table.getNumero() + ": remaining balance is " + bill.remainingBalance() + " €");
        }

        boolean result = executeTableLiberation(table);
        notificationService.notifierChangementTable(table);
        return result;
    }

    /**
     * Generates legal PDF receipt bytes for a completed transaction.
     *
     * @param transactionId Transaction reference
     * @return Binary PDF content
     */
    @Transactional(readOnly = true)
    public byte[] generateReceiptPdf(String transactionId) {
        OnlinePaymentTransaction transaction = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(ERR_TRANSACTION_NOT_FOUND + transactionId));

        Facture facture = transaction.getFacture();
        if (facture == null) {
            throw new BusinessException("No invoice associated with transaction " + transactionId);
        }

        return pdfService.generateFacturePdf(facture);
    }

    /**
     * Dispatches invoice receipt PDF via email.
     *
     * @param transactionId Transaction reference
     * @param recipientEmail Customer email destination
     * @return True if dispatch succeeded
     */
    @Transactional(readOnly = true)
    public boolean sendReceiptEmail(String transactionId, String recipientEmail) {
        OnlinePaymentTransaction transaction = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(ERR_TRANSACTION_NOT_FOUND + transactionId));
        return internalSendReceiptEmail(transaction, recipientEmail);
    }

    private boolean internalSendReceiptEmail(OnlinePaymentTransaction transaction, String recipientEmail) {
        Facture facture = transaction.getFacture();
        if (facture == null) {
            throw new BusinessException("No invoice linked to transaction " + transaction.getTransactionId());
        }

        byte[] pdfBytes = pdfService.generateFacturePdf(facture);
        AppSettings settings = appSettingsService.getSettings();

        return emailReceiptService.sendReceiptPdf(
                recipientEmail,
                facture.getNumero(),
                pdfBytes,
                settings.getEstablishmentName()
        );
    }

    private PaymentSuccessResponseDTO buildSuccessDTO(OnlinePaymentTransaction tx) {
        TableBillSummaryResponseDTO bill = internalGetTableBillSummary(tx.getTable(), tx.getTable().getId(), null);
        boolean isTableLiberated = !tx.getTable().isOccupee();

        return new PaymentSuccessResponseDTO(
                tx.getTransactionId(),
                tx.getFacture() != null ? tx.getFacture().getId() : null,
                tx.getReglement() != null ? tx.getReglement().getId() : null,
                tx.getStatus(),
                tx.getAmount(),
                tx.getTip(),
                tx.getTotalCharged(),
                bill.remainingBalance(),
                bill.isFullySettled(),
                isTableLiberated,
                tx.getReceiptUrl()
        );
    }
}
