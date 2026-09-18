package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CashDrawerSessionRepository;
import com.bar.gestioncocktail.repository.CashMovementRepository;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CashDrawerService}.
 */
@ExtendWith(MockitoExtension.class)
class CashDrawerServiceTest {

    @Mock
    private CashDrawerSessionRepository sessionRepository;

    @Mock
    private CashMovementRepository movementRepository;

    @Mock
    private DailyCashClosureRepository closureRepository;

    @Mock
    private FactureService factureService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private TimeService timeService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private ObjectProvider<EscPosPrintingService> printingServiceProvider;

    @InjectMocks
    private CashDrawerService service;

    private LocalDate testDate;
    private User testOperator;
    private DailyRecapDTO testRecap;

    @BeforeEach
    void setUp() {
        testDate = LocalDate.of(2026, 9, 18);
        lenient().when(timeService.getZoneId()).thenReturn(ZoneId.of("Europe/Paris"));
        lenient().when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CASH_DRAWER)).thenReturn(true);

        testOperator = new User();
        testOperator.setId(1L);
        testOperator.setUsername("manager");

        testRecap = new DailyRecapDTO(
                testDate,
                new BigDecimal("1200.00"),
                new BigDecimal("1000.00"),
                new BigDecimal("200.00"),
                10,
                new BigDecimal("120.00"),
                25,
                List.of(new PaymentModeSummaryDTO("ESPECES", 5, new BigDecimal("200.00"))),
                List.of(new VatSummaryDTO("20.0%", new BigDecimal("1000.00"), new BigDecimal("200.00"), new BigDecimal("1200.00")))
        );
    }

    @Test
    @DisplayName("getStatus: returns open status with theoretical cash calculation")
    void testGetStatusOpenSession() {
        CashDrawerSession session = new CashDrawerSession();
        session.setId(1L);
        session.setSessionDate(testDate);
        session.setOpeningFloat(new BigDecimal("150.00"));
        session.setStatus(CashDrawerSessionStatus.OPEN);
        session.setOpenedAt(testDate.atTime(9, 0));
        session.setOpenedBy(testOperator);

        when(sessionRepository.findBySessionDateAndStatus(testDate, CashDrawerSessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(factureService.getDailyRecap(testDate)).thenReturn(testRecap);

        CashMovement cashIn = new CashMovement();
        cashIn.setType(CashMovementType.CASH_IN);
        cashIn.setAmount(new BigDecimal("50.00"));

        CashMovement cashDrop = new CashMovement();
        cashDrop.setType(CashMovementType.CASH_DROP);
        cashDrop.setAmount(new BigDecimal("70.00"));

        when(movementRepository.findByMovementDateOrderByTimestampAsc(testDate))
                .thenReturn(List.of(cashIn, cashDrop));

        CashDrawerStatusDTO status = service.getStatus(testDate);

        assertThat(status.isOpened()).isTrue();
        assertThat(status.openingFloat()).isEqualByComparingTo("150.00");
        assertThat(status.totalCashRevenue()).isEqualByComparingTo("200.00");
        assertThat(status.totalCashIn()).isEqualByComparingTo("50.00");
        assertThat(status.totalCashDrop()).isEqualByComparingTo("70.00");
        // 150 (float) + 200 (sales) + 50 (in) - 70 (drop) = 330.00
        assertThat(status.currentTheoreticalCash()).isEqualByComparingTo("330.00");
        assertThat(status.movementsCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("openDrawer: successfully creates new session")
    void testOpenDrawerSuccess() {
        when(closureRepository.existsByClosureDate(any(LocalDate.class))).thenReturn(false);
        when(sessionRepository.existsBySessionDateAndStatus(any(LocalDate.class), eq(CashDrawerSessionStatus.OPEN))).thenReturn(false);
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(testOperator));
        when(sessionRepository.save(any())).thenAnswer(inv -> {
            CashDrawerSession s = inv.getArgument(0);
            s.setId(10L);
            return s;
        });

        CashDrawerOpenRequestDTO request = new CashDrawerOpenRequestDTO(
                new BigDecimal("150.00"),
                null,
                "Ready for lunch service"
        );

        CashDrawerSessionDTO result = service.openDrawer(request, "manager");

        assertThat(result).isNotNull();
        assertThat(result.openingFloat()).isEqualByComparingTo("150.00");
        assertThat(result.status()).isEqualTo(CashDrawerSessionStatus.OPEN);
        assertThat(result.notes()).isEqualTo("Ready for lunch service");
        verify(sessionRepository).save(any(CashDrawerSession.class));
    }

    @Test
    @DisplayName("openDrawer: rejects opening when session is already open")
    void testOpenDrawerAlreadyOpen() {
        when(closureRepository.existsByClosureDate(any(LocalDate.class))).thenReturn(false);
        when(sessionRepository.existsBySessionDateAndStatus(any(LocalDate.class), eq(CashDrawerSessionStatus.OPEN))).thenReturn(true);

        CashDrawerOpenRequestDTO request = new CashDrawerOpenRequestDTO(
                new BigDecimal("150.00"),
                null,
                null
        );

        assertThatThrownBy(() -> service.openDrawer(request, "manager"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already open");
    }

    @Test
    @DisplayName("openDrawer: rejects opening when register is already closed")
    void testOpenDrawerRegisterClosed() {
        when(closureRepository.existsByClosureDate(any(LocalDate.class))).thenReturn(true);

        CashDrawerOpenRequestDTO request = new CashDrawerOpenRequestDTO(
                new BigDecimal("150.00"),
                null,
                null
        );

        assertThatThrownBy(() -> service.openDrawer(request, "manager"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already closed");
    }

    @Test
    @DisplayName("recordMovement: successfully records CASH_IN")
    void testRecordMovementCashIn() {
        CashDrawerSession session = new CashDrawerSession();
        session.setId(1L);
        session.setStatus(CashDrawerSessionStatus.OPEN);
        session.setOpeningFloat(new BigDecimal("100.00"));

        when(closureRepository.existsByClosureDate(any(LocalDate.class))).thenReturn(false);
        when(sessionRepository.findBySessionDateAndStatus(any(LocalDate.class), eq(CashDrawerSessionStatus.OPEN)))
                .thenReturn(Optional.of(session));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(testOperator));
        when(movementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            m.setId(101L);
            return m;
        });

        CashMovementRequestDTO req = new CashMovementRequestDTO(
                CashMovementType.CASH_IN,
                new BigDecimal("40.00"),
                "Adding change coins",
                "COIN-001"
        );

        CashMovementDTO result = service.recordMovement(req, "manager");

        assertThat(result).isNotNull();
        assertThat(result.type()).isEqualTo(CashMovementType.CASH_IN);
        assertThat(result.amount()).isEqualByComparingTo("40.00");
        assertThat(result.reason()).isEqualTo("Adding change coins");
        verify(movementRepository).save(any(CashMovement.class));
    }

    @Test
    @DisplayName("recordMovement: rejects CASH_DROP when requested amount exceeds theoretical cash")
    void testRecordMovementOverdraw() {
        CashDrawerSession session = new CashDrawerSession();
        session.setId(1L);
        session.setStatus(CashDrawerSessionStatus.OPEN);
        session.setOpeningFloat(new BigDecimal("100.00"));

        when(closureRepository.existsByClosureDate(any(LocalDate.class))).thenReturn(false);
        when(sessionRepository.findBySessionDateAndStatus(any(LocalDate.class), eq(CashDrawerSessionStatus.OPEN)))
                .thenReturn(Optional.of(session));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(testOperator));
        when(factureService.getDailyRecap(any(LocalDate.class))).thenReturn(testRecap);
        when(movementRepository.findByMovementDateOrderByTimestampAsc(any(LocalDate.class))).thenReturn(List.of());

        // Available cash = 100 (float) + 200 (sales) = 300.00
        CashMovementRequestDTO req = new CashMovementRequestDTO(
                CashMovementType.CASH_DROP,
                new BigDecimal("350.00"),
                "Excessive safe drop",
                null
        );

        assertThatThrownBy(() -> service.recordMovement(req, "manager"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot withdraw");
    }

    @Test
    @DisplayName("recordMovement: rejects operation when till is not open")
    void testRecordMovementTillClosed() {
        when(closureRepository.existsByClosureDate(any(LocalDate.class))).thenReturn(false);
        when(sessionRepository.findBySessionDateAndStatus(any(LocalDate.class), eq(CashDrawerSessionStatus.OPEN)))
                .thenReturn(Optional.empty());

        CashMovementRequestDTO req = new CashMovementRequestDTO(
                CashMovementType.CASH_IN,
                new BigDecimal("20.00"),
                "Deposit",
                null
        );

        assertThatThrownBy(() -> service.recordMovement(req, "manager"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No active cash drawer session is open");
    }

    @Test
    @DisplayName("getXReport: generates non-destructive snapshot successfully")
    void testGetXReportSuccess() {
        CashDrawerSession session = new CashDrawerSession();
        session.setId(1L);
        session.setOpeningFloat(new BigDecimal("150.00"));
        session.setStatus(CashDrawerSessionStatus.OPEN);

        when(sessionRepository.findBySessionDateAndStatus(testDate, CashDrawerSessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(factureService.getDailyRecap(testDate)).thenReturn(testRecap);
        when(movementRepository.findByMovementDateOrderByTimestampAsc(testDate)).thenReturn(List.of());

        XReportDTO report = service.getXReport(testDate, "manager");

        assertThat(report).isNotNull();
        assertThat(report.reportDate()).isEqualTo(testDate);
        assertThat(report.totalRevenueTTC()).isEqualByComparingTo("1200.00");
        assertThat(report.openingFloat()).isEqualByComparingTo("150.00");
        assertThat(report.theoreticalCashInDrawer()).isEqualByComparingTo("350.00"); // 150 + 200
        assertThat(report.generatedBy()).isEqualTo("manager");
    }

    @Test
    @DisplayName("openDrawer: rejects operation when CASH_DRAWER module is disabled")
    void testOpenDrawerModuleDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CASH_DRAWER)).thenReturn(false);

        CashDrawerOpenRequestDTO req = new CashDrawerOpenRequestDTO(new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> service.openDrawer(req, "manager"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cash drawer management module is disabled");
    }
}
