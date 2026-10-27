package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
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
}
