package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureReglement;
import com.bar.gestioncocktail.model.OnlinePaymentTransaction;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.*;
import com.bar.gestioncocktail.service.payment.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OnlinePaymentService verifying table bill calculation,
 * payment intent creation, sandbox simulation, balance validation,
 * receipt dispatch, and table liberation.
 */
@ExtendWith(MockitoExtension.class)
class OnlinePaymentServiceTest {

    @Mock
    private OnlinePaymentTransactionRepository transactionRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private FactureRepository factureRepository;

    @Mock
    private FactureReglementRepository reglementRepository;

    @Mock
    private FactureService factureService;

    @Mock
    private PdfService pdfService;

    @Mock
    private EmailReceiptService emailReceiptService;

    @Mock
    private StripePaymentProvider stripePaymentProvider;

    @Mock
    private SandboxPaymentProvider sandboxPaymentProvider;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OnlinePaymentService onlinePaymentService;

    private TableEntity testTable;
    private AppSettings testSettings;

    @BeforeEach
    void setUp() {
        testTable = new TableEntity();
        testTable.setId(10L);
        testTable.setNumero(4);
        testTable.setOccupee(true);

        testSettings = new AppSettings();
        testSettings.setEstablishmentName("OpenBar Demo");
        testSettings.setOnlinePaymentProvider("SANDBOX");
        testSettings.setOnlinePaymentCurrency("EUR");

        lenient().when(sandboxPaymentProvider.getProviderName()).thenReturn("SANDBOX");
        lenient().when(appSettingsService.getSettings()).thenReturn(testSettings);
        lenient().when(establishmentConfigService.isModuleEnabled(EstablishmentModule.QR_PAY_AT_TABLE)).thenReturn(true);
    }

    @Test
    @DisplayName("getTableBillSummary - should throw ResourceNotFoundException when table does not exist")
    void getTableBillSummary_tableNotFound_throwsException() {
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> onlinePaymentService.getTableBillSummary(999L, null));
    }

    @Test
    @DisplayName("getTableBillSummary - nominal case with active bill and sandbox provider")
    void getTableBillSummary_nominal_returnsSummary() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.QR_PAY_AT_TABLE)).thenReturn(true);
        when(appSettingsService.getSettings()).thenReturn(testSettings);

        List<TableAdditionItemDTO> items = List.of(
                new TableAdditionItemDTO(1L, 101L, 201L, "Mojito", null, 2, BigDecimal.valueOf(10.0), BigDecimal.valueOf(20.0), BigDecimal.valueOf(16.67), BigDecimal.valueOf(3.33), "20%"),
                new TableAdditionItemDTO(2L, 101L, 202L, "Cosmopolitan", null, 1, BigDecimal.valueOf(10.0), BigDecimal.valueOf(10.0), BigDecimal.valueOf(8.33), BigDecimal.valueOf(1.67), "20%")
        );

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                items, List.of(101L), BigDecimal.valueOf(25.0), BigDecimal.valueOf(5.0), BigDecimal.valueOf(30.0),
                3, false, null
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        TableBillSummaryResponseDTO result = onlinePaymentService.getTableBillSummary(10L, "Alex");

        assertNotNull(result);
        assertEquals(10L, result.tableId());
        assertEquals(4, result.tableNumero());
        assertEquals(BigDecimal.valueOf(30.0), result.totalTTC());
        assertEquals(BigDecimal.ZERO, result.alreadyPaidAmount());
        assertEquals(BigDecimal.valueOf(30.0), result.remainingBalance());
        assertEquals("SANDBOX", result.paymentProvider());
        assertEquals(2, result.items().size());
    }

    @Test
    @DisplayName("createPaymentIntent - should reject when amount exceeds remaining balance")
    void createPaymentIntent_amountExceedsBalance_throwsException() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(40.0), BigDecimal.valueOf(10.0), BigDecimal.valueOf(50.0),
                0, false, null
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        PaymentIntentRequestDTO request = new PaymentIntentRequestDTO(
                BigDecimal.valueOf(80.0), // Exceeds 50.0
                BigDecimal.ZERO,
                "TOTALITE",
                "Alex",
                null,
                "idemp-key-001",
                false,
                null
        );

        assertThrows(BusinessException.class, () -> onlinePaymentService.createPaymentIntent(10L, request));
    }

    @Test
    @DisplayName("createPaymentIntent - nominal case with Sandbox provider")
    void createPaymentIntent_nominalSandbox_createsTransaction() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));
        when(appSettingsService.getSettings()).thenReturn(testSettings);

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(40.0), BigDecimal.valueOf(10.0), BigDecimal.valueOf(50.0),
                0, false, null
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        when(sandboxPaymentProvider.createPaymentIntent(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PaymentIntentResult(
                        "tx_sim_123",
                        "secret_123",
                        BigDecimal.valueOf(25.0),
                        BigDecimal.valueOf(2.5),
                        BigDecimal.valueOf(27.5),
                        "EUR",
                        "SANDBOX",
                        null
                ));

        Facture mockFacture = new Facture();
        mockFacture.setId(55L);
        mockFacture.setNumero("FAC-2026-00055");
        when(factureService.genererFactureTable(10L)).thenReturn(FactureResponseDTO.from(mockFacture));
        when(factureRepository.findById(55L)).thenReturn(Optional.of(mockFacture));

        when(transactionRepository.save(any(OnlinePaymentTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PaymentIntentRequestDTO request = new PaymentIntentRequestDTO(
                BigDecimal.valueOf(25.0),
                BigDecimal.valueOf(2.5),
                "PART_EGALE",
                "Alex",
                null,
                "idemp-key-002",
                false,
                "alex@example.com"
        );

        PaymentIntentResponseDTO response = onlinePaymentService.createPaymentIntent(10L, request);

        assertNotNull(response);
        assertEquals("tx_sim_123", response.transactionId());
        assertEquals("secret_123", response.clientSecret());
        assertEquals("SANDBOX", response.provider());
        assertEquals(BigDecimal.valueOf(27.5), response.totalCharged());
    }

    @Test
    @DisplayName("confirmSandboxPayment - nominal settlement and invoice generation")
    void confirmSandboxPayment_nominal_recordsPayment() {
        Facture mockFacture = new Facture();
        mockFacture.setId(55L);
        mockFacture.setNumero("FAC-2026-00055");
        mockFacture.setTotal(BigDecimal.valueOf(30.0));
        mockFacture.setTotalTTC(BigDecimal.valueOf(30.0));
        mockFacture.setReglee(false);

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setId(100L);
        tx.setTransactionId("tx_sim_123");
        tx.setTable(testTable);
        tx.setFacture(mockFacture);
        tx.setAmount(BigDecimal.valueOf(30.0));
        tx.setTip(BigDecimal.valueOf(2.0));
        tx.setTotalCharged(BigDecimal.valueOf(32.0));
        tx.setStatus("PENDING");
        tx.setProvider("SANDBOX");
        tx.setClientSecret("secret_123");

        when(transactionRepository.findByTransactionId("tx_sim_123")).thenReturn(Optional.of(tx));

        FactureReglementDTO mockReglementDTO = new FactureReglementDTO(
                100L, 55L, "Alex", 1, 1, BigDecimal.valueOf(30.0), BigDecimal.valueOf(2.0), BigDecimal.valueOf(32.0),
                "CARTE_EN_LIGNE", "TOTALITE", List.of(), LocalDateTime.now()
        );
        when(factureService.encaisserPart(eq(55L), any())).thenReturn(mockReglementDTO);

        FactureReglement mockReglement = new FactureReglement();
        mockReglement.setId(100L);
        when(reglementRepository.findById(100L)).thenReturn(Optional.of(mockReglement));

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(25.0), BigDecimal.valueOf(5.0), BigDecimal.valueOf(30.0),
                0, true, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        ConfirmSandboxPaymentRequestDTO request = new ConfirmSandboxPaymentRequestDTO(
                "tx_sim_123",
                "secret_123",
                "card"
        );

        PaymentSuccessResponseDTO response = onlinePaymentService.confirmSandboxPayment(10L, request);

        assertNotNull(response);
        assertEquals("tx_sim_123", response.transactionId());
        assertEquals(BigDecimal.valueOf(32.0), response.totalCharged());
        assertEquals("SUCCEEDED", response.status());
    }

    @Test
    @DisplayName("liberateTableIfSettled - frees table when remaining balance is zero")
    void liberateTableIfSettled_nominal_freesTable() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(25.0), BigDecimal.valueOf(5.0), BigDecimal.valueOf(30.0),
                0, true, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        FactureReglementDTO reglement = new FactureReglementDTO(
                1L, 55L, "Alex", 1, 1, BigDecimal.valueOf(30.0), BigDecimal.ZERO, BigDecimal.valueOf(30.0),
                "CARTE_EN_LIGNE", "TOTALITE", List.of(), LocalDateTime.now()
        );
        when(factureService.getReglementsByFactureId(55L)).thenReturn(List.of(reglement));

        boolean result = onlinePaymentService.liberateTableIfSettled(10L);

        assertTrue(result);
        assertFalse(testTable.isOccupee());
        verify(tableRepository, times(1)).save(testTable);
    }

    @Test
    @DisplayName("generateReceiptPdf - returns binary PDF when transaction and invoice exist")
    void generateReceiptPdf_nominal_returnsBytes() {
        Facture facture = new Facture();
        facture.setId(55L);
        facture.setNumero("FAC-2026-00055");

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_pdf_01");
        tx.setTable(testTable);
        tx.setAmount(BigDecimal.TEN);
        tx.setTotalCharged(BigDecimal.TEN);
        tx.setCurrency("EUR");
        tx.setProvider("SANDBOX");
        tx.setStatus("SUCCEEDED");
        tx.setIdempotencyKey("idemp_pdf_01");
        tx.setFacture(facture);

        when(transactionRepository.findByTransactionId("tx_pdf_01")).thenReturn(Optional.of(tx));
        when(pdfService.generateFacturePdf(facture)).thenReturn(new byte[]{1, 2, 3});

        byte[] result = onlinePaymentService.generateReceiptPdf("tx_pdf_01");

        assertNotNull(result);
        assertEquals(3, result.length);
    }

    @Test
    @DisplayName("sendReceiptEmail - dispatches email via emailReceiptService")
    void sendReceiptEmail_nominal_dispatchesEmail() {
        Facture facture = new Facture();
        facture.setId(55L);
        facture.setNumero("FAC-2026-00055");

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_mail_01");
        tx.setTable(testTable);
        tx.setAmount(BigDecimal.TEN);
        tx.setTotalCharged(BigDecimal.TEN);
        tx.setCurrency("EUR");
        tx.setProvider("SANDBOX");
        tx.setStatus("SUCCEEDED");
        tx.setIdempotencyKey("idemp_mail_01");
        tx.setFacture(facture);

        when(transactionRepository.findByTransactionId("tx_mail_01")).thenReturn(Optional.of(tx));
        when(pdfService.generateFacturePdf(facture)).thenReturn(new byte[]{1, 2, 3});
        when(emailReceiptService.sendReceiptPdf(eq("patron@example.com"), eq("FAC-2026-00055"), any(), any()))
                .thenReturn(true);

        boolean result = onlinePaymentService.sendReceiptEmail("tx_mail_01", "patron@example.com");

        assertTrue(result);
    }

    @Test
    @DisplayName("handleStripeWebhook - processes webhook from stripePaymentProvider")
    void handleStripeWebhook_nominal_processesEvent() {
        PaymentWebhookResult webhookResult = new PaymentWebhookResult(
                null,
                "IGNORED",
                null,
                BigDecimal.ZERO,
                "EUR",
                null
        );
        when(stripePaymentProvider.parseAndVerifyWebhook("{}", "sig")).thenReturn(webhookResult);

        PaymentWebhookResult result = onlinePaymentService.handleStripeWebhook("{}", "sig");

        assertNotNull(result);
        assertEquals("IGNORED", result.status());
    }

    @Test
    @DisplayName("handleStripeWebhook - processes SUCCEEDED webhook and finalizes payment on existing transaction")
    void handleStripeWebhook_succeeded_finalizesPayment() {
        PaymentWebhookResult webhookResult = new PaymentWebhookResult(
                "pi_stripe_succeeded",
                "SUCCEEDED",
                "card",
                BigDecimal.valueOf(20.0),
                "EUR",
                "customer@bar.local"
        );
        when(stripePaymentProvider.parseAndVerifyWebhook("{}", "sig")).thenReturn(webhookResult);

        Facture facture = new Facture();
        facture.setId(55L);
        facture.setNumero("FAC-2026-00055");

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("pi_stripe_succeeded");
        tx.setTable(testTable);
        tx.setAmount(BigDecimal.valueOf(20.0));
        tx.setTotalCharged(BigDecimal.valueOf(20.0));
        tx.setCurrency("EUR");
        tx.setProvider("STRIPE");
        tx.setStatus("PENDING");
        tx.setFacture(facture);

        when(transactionRepository.findByTransactionId("pi_stripe_succeeded")).thenReturn(Optional.of(tx));

        FactureReglementDTO mockReglement = new FactureReglementDTO(
                100L, 55L, "Client QR", 1, 1, BigDecimal.valueOf(20.0), BigDecimal.ZERO, BigDecimal.valueOf(20.0),
                "CARTE_EN_LIGNE", "TOTALITE", List.of(), LocalDateTime.now()
        );
        when(factureService.encaisserPart(eq(55L), any(EncaisserPartRequest.class))).thenReturn(mockReglement);

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(20.0), BigDecimal.ZERO, BigDecimal.valueOf(20.0),
                0, true, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        PaymentWebhookResult result = onlinePaymentService.handleStripeWebhook("{}", "sig");

        assertNotNull(result);
        assertEquals("SUCCEEDED", result.status());
        assertEquals("customer@bar.local", tx.getCustomerEmail());
        assertEquals("SUCCEEDED", tx.getStatus());
    }

    @Test
    @DisplayName("handleStripeWebhook - handles SUCCEEDED webhook with unknown transaction without error")
    void handleStripeWebhook_succeededWithUnknownTransaction_logsWarning() {
        PaymentWebhookResult webhookResult = new PaymentWebhookResult(
                "pi_unknown_123",
                "SUCCEEDED",
                "card",
                BigDecimal.valueOf(20.0),
                "EUR",
                null
        );
        when(stripePaymentProvider.parseAndVerifyWebhook("{}", "sig")).thenReturn(webhookResult);
        when(transactionRepository.findByTransactionId("pi_unknown_123")).thenReturn(Optional.empty());

        PaymentWebhookResult result = onlinePaymentService.handleStripeWebhook("{}", "sig");

        assertNotNull(result);
        assertEquals("SUCCEEDED", result.status());
    }

    @Test
    @DisplayName("finalizePaymentSuccess - returns idempotent success when already SUCCEEDED")
    void finalizePaymentSuccess_alreadySucceeded_returnsIdempotentSuccess() {
        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(10.0), BigDecimal.ZERO, BigDecimal.valueOf(10.0),
                0, true, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_already_done");
        tx.setTable(testTable);
        tx.setAmount(BigDecimal.TEN);
        tx.setTotalCharged(BigDecimal.TEN);
        tx.setStatus("SUCCEEDED");
        tx.setReceiptUrl("/receipt.pdf");

        PaymentSuccessResponseDTO result = onlinePaymentService.finalizePaymentSuccess(tx, "card");

        assertNotNull(result);
        assertEquals("tx_already_done", result.transactionId());
        assertEquals("SUCCEEDED", result.status());
    }

    @Test
    @DisplayName("createPaymentIntent - throws ResourceNotFoundException when table not found")
    void createPaymentIntent_tableNotFound_throwsResourceNotFoundException() {
        PaymentIntentRequestDTO req = new PaymentIntentRequestDTO(
                BigDecimal.TEN, BigDecimal.ZERO, "TOTALITE", "Alex", null, "idemp_not_found", false, null
        );
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> onlinePaymentService.createPaymentIntent(999L, req));
    }

    @Test
    @DisplayName("resolveProvider - returns stripe provider when preferred and available")
    void resolveProvider_stripePreferredAndAvailable_returnsStripeProvider() {
        testSettings.setOnlinePaymentProvider("STRIPE");
        when(stripePaymentProvider.isAvailable()).thenReturn(true);

        PaymentGatewayProvider provider = onlinePaymentService.resolveProvider();

        assertEquals(stripePaymentProvider, provider);
    }

    @Test
    @DisplayName("resolveProvider - falls back to sandbox when stripe unavailable")
    void resolveProvider_stripeUnavailable_fallsBackToSandbox() {
        testSettings.setOnlinePaymentProvider("STRIPE");
        when(stripePaymentProvider.isAvailable()).thenReturn(false);

        PaymentGatewayProvider provider = onlinePaymentService.resolveProvider();

        assertEquals(sandboxPaymentProvider, provider);
    }

    @Test
    @DisplayName("createPaymentIntent - throws when QR_PAY_AT_TABLE module is disabled")
    void createPaymentIntent_moduleDisabled_throwsException() {
        doThrow(new BusinessException("Module QR_PAY_AT_TABLE is disabled"))
                .when(establishmentConfigService).checkModuleEnabled(EstablishmentModule.QR_PAY_AT_TABLE);

        PaymentIntentRequestDTO req = new PaymentIntentRequestDTO(
                BigDecimal.TEN, BigDecimal.ZERO, "TOTALITE", "Alex", null, "idemp_disabled", false, null
        );

        assertThrows(BusinessException.class, () -> onlinePaymentService.createPaymentIntent(10L, req));
    }

    @Test
    @DisplayName("createPaymentIntent - returns idempotent cached transaction when key matches existing")
    void createPaymentIntent_idempotencyHit_returnsCachedTransaction() {
        OnlinePaymentTransaction existingTx = new OnlinePaymentTransaction();
        existingTx.setTransactionId("tx_cached_001");
        existingTx.setClientSecret("secret_cached_001");
        existingTx.setAmount(BigDecimal.TEN);
        existingTx.setTip(BigDecimal.ZERO);
        existingTx.setTotalCharged(BigDecimal.TEN);
        existingTx.setCurrency("EUR");
        existingTx.setProvider("SANDBOX");
        existingTx.setStatus("PENDING");

        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));
        when(transactionRepository.findByIdempotencyKey("idemp_cached_hit")).thenReturn(Optional.of(existingTx));

        PaymentIntentRequestDTO req = new PaymentIntentRequestDTO(
                BigDecimal.TEN, BigDecimal.ZERO, "TOTALITE", "Alex", null, "idemp_cached_hit", false, null
        );

        PaymentIntentResponseDTO response = onlinePaymentService.createPaymentIntent(10L, req);

        assertNotNull(response);
        assertEquals("tx_cached_001", response.transactionId());
        assertEquals("secret_cached_001", response.clientSecret());
    }

    @Test
    @DisplayName("createPaymentIntent - throws BusinessException when table addition has no items")
    void createPaymentIntent_noItemsOnBill_throwsBusinessException() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                0, false, null
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        PaymentIntentRequestDTO req = new PaymentIntentRequestDTO(
                BigDecimal.TEN, BigDecimal.ZERO, "TOTALITE", "Alex", null, "idemp_no_items", false, null
        );

        assertThrows(BusinessException.class, () -> onlinePaymentService.createPaymentIntent(10L, req));
    }

    @Test
    @DisplayName("createPaymentIntent - throws BusinessException when addition is already fully settled")
    void createPaymentIntent_alreadyFullySettled_throwsBusinessException() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(8.0), BigDecimal.valueOf(2.0), BigDecimal.TEN,
                0, true, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);
        FactureReglementDTO reglement = new FactureReglementDTO(
                1L, 55L, "Alex", 1, 1, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN,
                "CARTE_EN_LIGNE", "TOTALITE", List.of(), LocalDateTime.now()
        );
        when(factureService.getReglementsByFactureId(55L)).thenReturn(List.of(reglement));

        PaymentIntentRequestDTO req = new PaymentIntentRequestDTO(
                BigDecimal.TEN, BigDecimal.ZERO, "TOTALITE", "Alex", null, "idemp_settled", false, null
        );

        assertThrows(BusinessException.class, () -> onlinePaymentService.createPaymentIntent(10L, req));
    }

    @Test
    @DisplayName("confirmSandboxPayment - throws BusinessException when transaction belongs to another table")
    void confirmSandboxPayment_tableMismatch_throwsBusinessException() {
        TableEntity otherTable = new TableEntity();
        otherTable.setId(99L);
        otherTable.setNumero(12);

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_wrong_table");
        tx.setTable(otherTable);
        tx.setClientSecret("secret_match");

        when(transactionRepository.findByTransactionId("tx_wrong_table")).thenReturn(Optional.of(tx));

        ConfirmSandboxPaymentRequestDTO req = new ConfirmSandboxPaymentRequestDTO(
                "tx_wrong_table", "secret_match", "card"
        );

        assertThrows(BusinessException.class, () -> onlinePaymentService.confirmSandboxPayment(10L, req));
    }

    @Test
    @DisplayName("confirmSandboxPayment - throws BusinessException when client secret does not match")
    void confirmSandboxPayment_secretMismatch_throwsBusinessException() {
        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_secret_mismatch");
        tx.setTable(testTable);
        tx.setClientSecret("expected_secret");

        when(transactionRepository.findByTransactionId("tx_secret_mismatch")).thenReturn(Optional.of(tx));

        ConfirmSandboxPaymentRequestDTO req = new ConfirmSandboxPaymentRequestDTO(
                "tx_secret_mismatch", "wrong_secret", "card"
        );

        assertThrows(BusinessException.class, () -> onlinePaymentService.confirmSandboxPayment(10L, req));
    }

    @Test
    @DisplayName("liberateTableIfSettled - throws BusinessException when remaining balance is not zero")
    void liberateTableIfSettled_balanceRemaining_throwsBusinessException() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(testTable));

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(25.0), BigDecimal.ZERO, BigDecimal.valueOf(25.0),
                0, false, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);

        assertThrows(BusinessException.class, () -> onlinePaymentService.liberateTableIfSettled(10L));
    }

    @Test
    @DisplayName("generateReceiptPdf - throws BusinessException when transaction has no linked invoice")
    void generateReceiptPdf_noInvoice_throwsBusinessException() {
        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_no_invoice");
        tx.setFacture(null);

        when(transactionRepository.findByTransactionId("tx_no_invoice")).thenReturn(Optional.of(tx));

        assertThrows(BusinessException.class, () -> onlinePaymentService.generateReceiptPdf("tx_no_invoice"));
    }

    @Test
    @DisplayName("sendReceiptEmail - throws BusinessException when transaction has no linked invoice")
    void sendReceiptEmail_noInvoice_throwsBusinessException() {
        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_no_invoice_mail");
        tx.setFacture(null);

        when(transactionRepository.findByTransactionId("tx_no_invoice_mail")).thenReturn(Optional.of(tx));

        assertThrows(BusinessException.class, () -> onlinePaymentService.sendReceiptEmail("tx_no_invoice_mail", "test@bar.local"));
    }

    @Test
    @DisplayName("finalizePaymentSuccess - executes table liberation when fully settled and liberateTableRequested is true")
    void finalizePaymentSuccess_liberatesTable_whenRequestedAndSettled() {
        Facture facture = new Facture();
        facture.setId(55L);
        facture.setNumero("FAC-2026-00055");

        OnlinePaymentTransaction tx = new OnlinePaymentTransaction();
        tx.setTransactionId("tx_liberate_requested");
        tx.setTable(testTable);
        tx.setAmount(BigDecimal.valueOf(30.0));
        tx.setTotalCharged(BigDecimal.valueOf(30.0));
        tx.setFacture(facture);
        tx.setStatus("PENDING");
        tx.setLiberateTableRequested(true);

        FactureReglementDTO mockReglement = new FactureReglementDTO(
                100L, 55L, "Client QR", 1, 1, BigDecimal.valueOf(30.0), BigDecimal.ZERO, BigDecimal.valueOf(30.0),
                "CARTE_EN_LIGNE", "TOTALITE", List.of(), LocalDateTime.now()
        );
        when(factureService.encaisserPart(eq(55L), any(EncaisserPartRequest.class))).thenReturn(mockReglement);

        TableAdditionResponseDTO mockAddition = new TableAdditionResponseDTO(
                10L, 4, "SALLE", 1L, "Lucas", LocalDateTime.now(),
                List.of(), List.of(101L), BigDecimal.valueOf(25.0), BigDecimal.valueOf(5.0), BigDecimal.valueOf(30.0),
                0, true, 55L
        );
        when(factureService.getTableAddition(10L)).thenReturn(mockAddition);
        when(factureService.getReglementsByFactureId(55L)).thenReturn(List.of(mockReglement));

        PaymentSuccessResponseDTO result = onlinePaymentService.finalizePaymentSuccess(tx, "card");

        assertNotNull(result);
        assertTrue(result.isTableLiberated());
        assertFalse(testTable.isOccupee());
        verify(tableRepository, atLeastOnce()).save(testTable);
    }
}
