package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.StockWasteRequestDTO;
import com.bar.gestioncocktail.dto.StockWasteSummaryDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.model.StockWasteReason;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.StockMovementRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit and non-regression tests for {@link StockMovementService}.
 */
@ExtendWith(MockitoExtension.class)
class StockMovementServiceTest {

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private IngredientService ingredientService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TimeService timeService;

    private StockMovementService stockMovementService;

    private Ingredient sampleIngredient;
    private User sampleUser;
    private final LocalDateTime fixedNow = LocalDateTime.of(2026, 9, 6, 15, 0, 0);

    @BeforeEach
    void setUp() {
        stockMovementService = new StockMovementService(
                stockMovementRepository,
                ingredientRepository,
                ingredientService,
                userRepository,
                auditLogService,
                timeService
        );

        sampleIngredient = new Ingredient();
        sampleIngredient.setId(10L);
        sampleIngredient.setNom("Rhum Blanc Diplomatico");
        sampleIngredient.setQuantiteStock(new BigDecimal("10.00"));
        sampleIngredient.setSeuilAlerte(new BigDecimal("3.00"));
        sampleIngredient.setUniteMesure("bouteille");
        sampleIngredient.setPrixUnitaire(new BigDecimal("25.50"));

        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setUsername("barman1");
    }

    @Test
    @DisplayName("recordWaste — nominal case: successfully records waste, deducts stock, and logs audit")
    void recordWaste_nominal_success() {
        when(timeService.now()).thenReturn(fixedNow);
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleIngredient));
        when(userRepository.findByUsername("barman1")).thenReturn(Optional.of(sampleUser));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(inv -> {
            StockMovement m = inv.getArgument(0);
            m.setId(100L);
            return m;
        });

        StockWasteRequestDTO request = new StockWasteRequestDTO(
                10L,
                new BigDecimal("2.00"),
                StockWasteReason.CASSE,
                "Bouteilles tombées lors du nettoyage"
        );

        StockMovement result = stockMovementService.recordWaste(request, "barman1", "127.0.0.1");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getIngredient()).isEqualTo(sampleIngredient);
        assertThat(result.getQuantity()).isEqualTo(new BigDecimal("2.00"));
        assertThat(result.getUnit()).isEqualTo("bouteille");
        assertThat(result.getReason()).isEqualTo(StockWasteReason.CASSE);
        assertThat(result.getReportedBy()).isEqualTo(sampleUser);
        assertThat(result.getCost()).isEqualTo(new BigDecimal("51.00"));
        assertThat(result.getRecordedAt()).isEqualTo(fixedNow);

        verify(ingredientService).updateStock(sampleIngredient, new BigDecimal("8.00"));
        verify(auditLogService).logAction(
                eq(sampleUser),
                eq("STOCK_WASTE_RECORDED"),
                eq("Ingredient"),
                eq(10L),
                any(),
                eq("127.0.0.1")
        );
    }

    @Test
    @DisplayName("recordWaste — throws BusinessException when request is null")
    void recordWaste_nullRequest_throwsBusinessException() {
        assertThatThrownBy(() -> stockMovementService.recordWaste(null, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Waste declaration request cannot be null");
    }

    @Test
    @DisplayName("recordWaste — throws ResourceNotFoundException when ingredient is not found")
    void recordWaste_ingredientNotFound_throwsResourceNotFoundException() {
        when(ingredientRepository.findById(999L)).thenReturn(Optional.empty());

        StockWasteRequestDTO request = new StockWasteRequestDTO(
                999L,
                new BigDecimal("1.00"),
                StockWasteReason.PEREMPTION,
                "Expiré"
        );

        assertThatThrownBy(() -> stockMovementService.recordWaste(request, "barman1", "127.0.0.1"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Ingredient not found with ID: 999");
    }

    @Test
    @DisplayName("recordWaste — throws BusinessException when quantity is zero or negative")
    void recordWaste_zeroOrNegativeQuantity_throwsBusinessException() {
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleIngredient));

        StockWasteRequestDTO requestZero = new StockWasteRequestDTO(
                10L,
                BigDecimal.ZERO,
                StockWasteReason.CASSE,
                "Test zero"
        );

        assertThatThrownBy(() -> stockMovementService.recordWaste(requestZero, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Wasted quantity must be greater than zero");

        StockWasteRequestDTO requestNegative = new StockWasteRequestDTO(
                10L,
                new BigDecimal("-2.50"),
                StockWasteReason.CASSE,
                "Test negative"
        );

        assertThatThrownBy(() -> stockMovementService.recordWaste(requestNegative, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Wasted quantity must be greater than zero");
    }

    @Test
    @DisplayName("recordWaste — throws BusinessException when quantity exceeds available stock")
    void recordWaste_quantityExceedsStock_throwsBusinessException() {
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleIngredient));

        StockWasteRequestDTO requestExceed = new StockWasteRequestDTO(
                10L,
                new BigDecimal("15.00"), // Stock is 10.00
                StockWasteReason.CASSE,
                "Exceeds inventory"
        );

        assertThatThrownBy(() -> stockMovementService.recordWaste(requestExceed, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot exceed available inventory stock");
    }

    @Test
    @DisplayName("recordWaste — non-regression: boundary exact quantity reaches 0.00 stock cleanly")
    void recordWaste_exactStockAmount_reachesZeroCleanly() {
        when(timeService.now()).thenReturn(fixedNow);
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleIngredient));
        when(stockMovementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StockWasteRequestDTO request = new StockWasteRequestDTO(
                10L,
                new BigDecimal("10.00"), // Exactly matches stock
                StockWasteReason.OFFERT_PATRON,
                null
        );

        StockMovement result = stockMovementService.recordWaste(request, null, null);

        assertThat(result).isNotNull();
        verify(ingredientService).updateStock(sampleIngredient, new BigDecimal("0.00"));
    }

    @Test
    @DisplayName("recordWaste — non-regression: rounds fractional unit cost half-up accurately")
    void recordWaste_fractionalCost_roundsHalfUp() {
        sampleIngredient.setPrixUnitaire(new BigDecimal("10.3333"));
        when(timeService.now()).thenReturn(fixedNow);
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleIngredient));
        when(stockMovementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StockWasteRequestDTO request = new StockWasteRequestDTO(
                10L,
                new BigDecimal("3.00"),
                StockWasteReason.ERREUR_PREPARATION,
                "Mauvais dosage"
        );

        StockMovement result = stockMovementService.recordWaste(request, "admin", "192.168.1.50");

        // 3.00 * 10.3333 = 30.9999 -> 31.00
        assertThat(result.getCost()).isEqualTo(new BigDecimal("31.00"));
    }

    @Test
    @DisplayName("getAllMovements & getMovementsByIngredient — nominal retrieval")
    void getMovements_nominal() {
        StockMovement m1 = new StockMovement();
        m1.setId(1L);
        StockMovement m2 = new StockMovement();
        m2.setId(2L);

        when(stockMovementRepository.findAllByOrderByRecordedAtDesc()).thenReturn(List.of(m1, m2));
        when(stockMovementRepository.findByIngredientIdOrderByRecordedAtDesc(10L)).thenReturn(List.of(m1));

        assertThat(stockMovementService.getAllMovements()).containsExactly(m1, m2);
        assertThat(stockMovementService.getMovementsByIngredient(10L)).containsExactly(m1);
    }

    @Test
    @DisplayName("getWasteSummary — consolidates totals and reason breakdowns")
    void getWasteSummary_nominal() {
        StockMovement m1 = new StockMovement();
        m1.setReason(StockWasteReason.CASSE);
        m1.setQuantity(new BigDecimal("2.00"));
        m1.setCost(new BigDecimal("50.00"));

        StockMovement m2 = new StockMovement();
        m2.setReason(StockWasteReason.PEREMPTION);
        m2.setQuantity(new BigDecimal("1.50"));
        m2.setCost(new BigDecimal("20.00"));

        StockMovement m3 = new StockMovement();
        m3.setReason(StockWasteReason.CASSE);
        m3.setQuantity(new BigDecimal("1.00"));
        m3.setCost(new BigDecimal("25.00"));

        when(stockMovementRepository.findAllByOrderByRecordedAtDesc()).thenReturn(List.of(m1, m2, m3));

        StockWasteSummaryDTO summary = stockMovementService.getWasteSummary();

        assertThat(summary.totalMovements()).isEqualTo(3);
        assertThat(summary.totalLossValue()).isEqualByComparingTo(new BigDecimal("95.00"));
        assertThat(summary.totalQuantityLost()).isEqualByComparingTo(new BigDecimal("4.50"));

        assertThat(summary.countByReason())
                .containsEntry(StockWasteReason.CASSE, 2L)
                .containsEntry(StockWasteReason.PEREMPTION, 1L)
                .containsEntry(StockWasteReason.OFFERT_PATRON, 0L);

        assertThat(summary.lossValueByReason().get(StockWasteReason.CASSE)).isEqualByComparingTo(new BigDecimal("75.00"));
        assertThat(summary.lossValueByReason().get(StockWasteReason.PEREMPTION)).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(summary.lossValueByReason().get(StockWasteReason.OFFERT_PATRON)).isZero();
    }
}
