package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ClotureCaisseRequestDTO;
import com.bar.gestioncocktail.dto.DailyRecapDTO;
import com.bar.gestioncocktail.dto.PaymentModeSummaryDTO;
import com.bar.gestioncocktail.dto.VatSummaryDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.DailyCashClosure;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.model.VatRate;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Comprehensive unit tests for DailyCashClosureService.
 */
@ExtendWith(MockitoExtension.class)
class DailyCashClosureServiceTest {

    @Mock
    private DailyCashClosureRepository closureRepository;

    @Mock
    private FactureService factureService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private DailyCashClosureService service;

    private LocalDate testDate;
    private DailyRecapDTO testRecap;
    private User testOperator;

    @BeforeEach
    void setUp() {
        testDate = LocalDate.of(2026, 9, 6);
        lenient().when(timeService.getZoneId()).thenReturn(ZoneId.of("Europe/Paris"));

        List<PaymentModeSummaryDTO> paymentModes = List.of(
                new PaymentModeSummaryDTO("ESPECES", 10, new BigDecimal("120.00")),
                new PaymentModeSummaryDTO("CARTE", 25, new BigDecimal("450.00"))
        );

        List<VatSummaryDTO> vatList = List.of(
                new VatSummaryDTO(VatRate.TWENTY, "20.0%", new BigDecimal("475.00"), new BigDecimal("95.00"), new BigDecimal("570.00"))
        );

        testRecap = new DailyRecapDTO(
                testDate,
                new BigDecimal("570.00"),
                new BigDecimal("475.00"),
                new BigDecimal("95.00"),
                35,
                new BigDecimal("16.29"),
                42,
                paymentModes,
                vatList
        );

        testOperator = new User();
        testOperator.setId(1L);
        testOperator.setUsername("manager1");
        testOperator.setNom("Martin");
        testOperator.setPrenom("Sophie");
        testOperator.setRoles(Set.of(UserRole.MANAGER));
    }

    @Test
    @DisplayName("cloturerCaisse nominal: registers closure with sequential number, matching cash, and SHA-256 seal")
    void cloturerCaisse_nominal_success() {
        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                testDate,
                new BigDecimal("50.00"),
                new BigDecimal("170.00"), // opening 50 + cash 120 = 170
                Map.of(),
                null
        );

        when(closureRepository.existsByClosureDate(testDate)).thenReturn(false);
        when(factureService.getDailyRecap(testDate)).thenReturn(testRecap);
        when(userRepository.findByUsername("manager1")).thenReturn(Optional.of(testOperator));
        when(closureRepository.countByClosureNumberStartingWith("Z-2026-")).thenReturn(0L);
        when(closureRepository.save(any(DailyCashClosure.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyCashClosure result = service.cloturerCaisse(request, "manager1");

        assertThat(result).isNotNull();
        assertThat(result.getClosureNumber()).isEqualTo("Z-2026-00001");
        assertThat(result.getClosureDate()).isEqualTo(testDate);
        assertThat(result.getOpeningFloat()).isEqualByComparingTo("50.00");
        assertThat(result.getTheoreticalCash()).isEqualByComparingTo("170.00");
        assertThat(result.getCountedCash()).isEqualByComparingTo("170.00");
        assertThat(result.getCashDiscrepancy()).isEqualByComparingTo("0.00");
        assertThat(result.getTotalRevenueTTC()).isEqualByComparingTo("570.00");
        assertThat(result.getTotalRevenueHT()).isEqualByComparingTo("475.00");
        assertThat(result.getClosedBy()).isEqualTo(testOperator);
        assertThat(result.getSha256Hash()).isNotNull().hasSize(64);
        verify(closureRepository).save(any(DailyCashClosure.class));
    }

    @Test
    @DisplayName("cloturerCaisse with discrepancy: succeeds when discrepancy note is provided")
    void cloturerCaisse_withDiscrepancyAndReason_success() {
        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                testDate,
                new BigDecimal("50.00"),
                new BigDecimal("165.00"), // counted 165 vs theoretical 170 -> discrepancy -5.00
                Map.of(),
                "Coin drawer miscount during busy shift"
        );

        when(closureRepository.existsByClosureDate(testDate)).thenReturn(false);
        when(factureService.getDailyRecap(testDate)).thenReturn(testRecap);
        when(userRepository.findByUsername("manager1")).thenReturn(Optional.of(testOperator));
        when(closureRepository.countByClosureNumberStartingWith("Z-2026-")).thenReturn(4L);
        when(closureRepository.save(any(DailyCashClosure.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyCashClosure result = service.cloturerCaisse(request, "manager1");

        assertThat(result.getClosureNumber()).isEqualTo("Z-2026-00005");
        assertThat(result.getCashDiscrepancy()).isEqualByComparingTo("-5.00");
        assertThat(result.getDiscrepancyReason()).isEqualTo("Coin drawer miscount during busy shift");
    }

    @Test
    @DisplayName("cloturerCaisse with discrepancy: throws BusinessException when note is missing")
    void cloturerCaisse_withDiscrepancyAndMissingReason_throwsException() {
        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                testDate,
                new BigDecimal("50.00"),
                new BigDecimal("165.00"),
                Map.of(),
                "   " // blank reason
        );

        when(closureRepository.existsByClosureDate(testDate)).thenReturn(false);
        when(factureService.getDailyRecap(testDate)).thenReturn(testRecap);

        assertThatThrownBy(() -> service.cloturerCaisse(request, "manager1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("justification note is mandatory");

        verify(closureRepository, never()).save(any());
    }

    @Test
    @DisplayName("cloturerCaisse throws BusinessException when date is already closed")
    void cloturerCaisse_alreadyClosed_throwsException() {
        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                testDate,
                new BigDecimal("50.00"),
                new BigDecimal("170.00"),
                Map.of(),
                null
        );

        when(closureRepository.existsByClosureDate(testDate)).thenReturn(true);

        assertThatThrownBy(() -> service.cloturerCaisse(request, "manager1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already closed");

        verify(closureRepository, never()).save(any());
    }

    @Test
    @DisplayName("getClosureById throws ResourceNotFoundException when not found")
    void getClosureById_notFound_throwsException() {
        when(closureRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getClosureById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("generateFecExport returns balanced journal entries")
    void generateFecExport_nominal_generatesFecEntries() {
        DailyCashClosure closure = new DailyCashClosure();
        closure.setId(10L);
        closure.setClosureNumber("Z-2026-00001");
        closure.setClosureDate(testDate);
        closure.setCashDiscrepancy(new BigDecimal("-5.00"));
        closure.setPaymentMethodsJson("[{\"modePaiement\":\"ESPECES\",\"count\":10,\"totalTtc\":120.00},{\"modePaiement\":\"CARTE\",\"count\":25,\"totalTtc\":450.00}]");
        closure.setVatBreakdownJson("[{\"tauxLabel\":\"20.0%\",\"baseHt\":475.00,\"montantTva\":95.00,\"totalTtc\":570.00}]");

        when(closureRepository.findById(10L)).thenReturn(Optional.of(closure));

        String fec = service.generateFecExport(10L);

        assertThat(fec)
                .isNotNull()
                .contains("JournalCode\tJournalLib\tEcritureNum")
                .contains("530000\tCaisse Espèces")
                .contains("512000\tBanque Cartes Bancaires")
                .contains("658000\tPertes sur écarts de caisse")
                .contains("706000\tPrestations de services (20.0%)")
                .contains("445710\tTVA collectée (20.0%)");
    }

    @Test
    @DisplayName("generateFecExport with positive discrepancy records surplus account 758000")
    void generateFecExport_surplusDiscrepancy_generatesSurplusEntry() {
        DailyCashClosure closure = new DailyCashClosure();
        closure.setId(11L);
        closure.setClosureNumber("Z-2026-00002");
        closure.setClosureDate(testDate);
        closure.setCashDiscrepancy(new BigDecimal("10.00"));
        closure.setPaymentMethodsJson("[{\"modePaiement\":\"CHECK\",\"count\":1,\"totalTtc\":50.00},{\"modePaiement\":\"AVOIR\",\"count\":1,\"totalTtc\":20.00},{\"modePaiement\":\"AUTRE\",\"count\":1,\"totalTtc\":10.00}]");
        closure.setVatBreakdownJson("[]");

        when(closureRepository.findById(11L)).thenReturn(Optional.of(closure));

        String fec = service.generateFecExport(11L);

        assertThat(fec)
                .isNotNull()
                .contains("758000\tProduits sur écarts de caisse")
                .contains("511200\tChèques à encaisser")
                .contains("419000\tClients - Avoirs et acomptes")
                .contains("580000\tRèglements Divers (AUTRE)");
    }

    @Test
    @DisplayName("getAllClosures returns list sorted by date descending")
    void getAllClosures_returnsList() {
        DailyCashClosure c1 = new DailyCashClosure();
        c1.setId(1L);
        when(closureRepository.findAllByOrderByClosureDateDesc()).thenReturn(List.of(c1));

        List<DailyCashClosure> result = service.getAllClosures();
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getClosureByDate returns closure when found")
    void getClosureByDate_found_returnsClosure() {
        DailyCashClosure c1 = new DailyCashClosure();
        c1.setId(1L);
        when(closureRepository.findByClosureDate(testDate)).thenReturn(Optional.of(c1));

        Optional<DailyCashClosure> result = service.getClosureByDate(testDate);
        assertThat(result).isPresent();
    }

    @Test
    @DisplayName("isDateClosed returns true when closure exists")
    void isDateClosed_closureExists_returnsTrue() {
        when(closureRepository.existsByClosureDate(testDate)).thenReturn(true);
        assertThat(service.isDateClosed(testDate)).isTrue();
    }

    @Test
    @DisplayName("isDateClosed returns false when date is null")
    void isDateClosed_nullDate_returnsFalse() {
        assertThat(service.isDateClosed(null)).isFalse();
    }
}
