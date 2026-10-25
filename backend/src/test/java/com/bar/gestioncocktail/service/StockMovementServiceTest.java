package com.bar.gestioncocktail.service;


import java.time.Month;
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

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    private StockMovementService stockMovementService;

    private Ingredient sampleIngredient;
    private User sampleUser;
    private final LocalDateTime fixedNow = LocalDateTime.of(2026, Month.SEPTEMBER, 6, 15, 0, 0);

    @BeforeEach
    void setUp() {
        stockMovementService = new StockMovementService(
                stockMovementRepository,
                ingredientRepository,
                ingredientService,
                userRepository,
                auditLogService,
                timeService,
                establishmentConfigService
        );
        org.mockito.Mockito.lenient().when(establishmentConfigService.isModuleEnabled(any())).thenReturn(true);

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
    void recordWasteNominalSuccess() {
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
    void recordWasteNullRequestThrowsBusinessException() {
        assertThatThrownBy(() -> stockMovementService.recordWaste(null, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Waste declaration request cannot be null");
    }

    @Test
    @DisplayName("recordWaste — throws ResourceNotFoundException when ingredient is not found")
    void recordWasteIngredientNotFoundThrowsResourceNotFoundException() {
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
    void recordWasteZeroOrNegativeQuantityThrowsBusinessException() {
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
    void recordWasteQuantityExceedsStockThrowsBusinessException() {
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
    void recordWasteExactStockAmountReachesZeroCleanly() {
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
    void recordWasteFractionalCostRoundsHalfUp() {
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

        StockMovement result = stockMovementService.recordWaste(request, "admin", "test-client-ip");

        // 3.00 * 10.3333 = 30.9999 -> 31.00
        assertThat(result.getCost()).isEqualTo(new BigDecimal("31.00"));
    }

    @Test
    @DisplayName("getAllMovements & getMovementsByIngredient — nominal retrieval")
    void getMovementsNominal() {
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
    void getWasteSummaryNominal() {
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

    @Test
    @DisplayName("recordQuickLog — nominal case: successfully records quick-log and generates default notes")
    void recordQuickLogNominalSuccess() {
        when(timeService.now()).thenReturn(fixedNow);
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(sampleIngredient));
        when(userRepository.findByUsername("barman1")).thenReturn(Optional.of(sampleUser));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(inv -> {
            StockMovement m = inv.getArgument(0);
            m.setId(100L);
            return m;
        });

        com.bar.gestioncocktail.dto.StockQuickLogRequestDTO quickLogReq = new com.bar.gestioncocktail.dto.StockQuickLogRequestDTO(
                10L,
                new BigDecimal("0.50"),
                StockWasteReason.ERREUR_PREPARATION,
                null
        );

        StockMovement result = stockMovementService.recordQuickLog(quickLogReq, "barman1", "127.0.0.1");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getNotes()).isEqualTo("Bartender Quick-Log (ERREUR_PREPARATION)");
        verify(ingredientService).updateStock(sampleIngredient, new BigDecimal("9.50"));
        verify(auditLogService).logAction(eq(sampleUser), eq("STOCK_WASTE_RECORDED"), eq("Ingredient"), eq(10L), any(), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("recordQuickLog — error case: throws BusinessException when payload is null")
    void recordQuickLogNullThrowsBusinessException() {
        assertThatThrownBy(() -> stockMovementService.recordQuickLog(null, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot be null");
    }

    @Test
    @DisplayName("revertQuickLog — nominal case: owner bartender successfully undoes movement within window")
    void revertQuickLogOwnerSuccess() {
        StockMovement movement = new StockMovement();
        movement.setId(42L);
        movement.setIngredient(sampleIngredient);
        movement.setQuantity(new BigDecimal("0.50"));
        movement.setUnit("bouteille");
        movement.setReason(StockWasteReason.ERREUR_PREPARATION);
        movement.setReportedBy(sampleUser);

        when(stockMovementRepository.findById(42L)).thenReturn(Optional.of(movement));
        when(userRepository.findByUsername("barman1")).thenReturn(Optional.of(sampleUser));

        stockMovementService.revertQuickLog(42L, "barman1", "127.0.0.1");

        verify(ingredientService).updateStock(sampleIngredient, new BigDecimal("10.50"));
        verify(stockMovementRepository).delete(movement);
        verify(auditLogService).logAction(eq(sampleUser), eq("STOCK_WASTE_REVERTED"), eq("StockMovement"), eq(42L), any(), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("revertQuickLog — nominal case: manager/admin successfully undoes any movement")
    void revertQuickLogManagerSuccess() {
        User manager = new User();
        manager.setId(99L);
        manager.setUsername("manager1");
        manager.setRoles(java.util.Set.of(com.bar.gestioncocktail.model.UserRole.MANAGER));

        StockMovement movement = new StockMovement();
        movement.setId(42L);
        movement.setIngredient(sampleIngredient);
        movement.setQuantity(new BigDecimal("1.00"));
        movement.setUnit("bouteille");
        movement.setReason(StockWasteReason.CASSE);
        movement.setReportedBy(sampleUser); // created by barman1

        when(stockMovementRepository.findById(42L)).thenReturn(Optional.of(movement));
        when(userRepository.findByUsername("manager1")).thenReturn(Optional.of(manager));

        stockMovementService.revertQuickLog(42L, "manager1", "127.0.0.1");

        verify(ingredientService).updateStock(sampleIngredient, new BigDecimal("11.00"));
        verify(stockMovementRepository).delete(movement);
    }

    @Test
    @DisplayName("revertQuickLog — error case: throws BusinessException when other unauthorized user attempts undo")
    void revertQuickLogUnauthorizedThrowsBusinessException() {
        User otherBarman = new User();
        otherBarman.setId(2L);
        otherBarman.setUsername("barman2");
        otherBarman.setRoles(java.util.Set.of(com.bar.gestioncocktail.model.UserRole.BARMAN));

        StockMovement movement = new StockMovement();
        movement.setId(42L);
        movement.setReportedBy(sampleUser); // created by barman1

        when(stockMovementRepository.findById(42L)).thenReturn(Optional.of(movement));
        when(userRepository.findByUsername("barman2")).thenReturn(Optional.of(otherBarman));

        assertThatThrownBy(() -> stockMovementService.revertQuickLog(42L, "barman2", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not authorized");
    }

    @Test
    @DisplayName("revertQuickLog — error case: throws ResourceNotFoundException when movement does not exist")
    void revertQuickLogNotFoundThrowsResourceNotFoundException() {
        when(stockMovementRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockMovementService.revertQuickLog(999L, "barman1", "127.0.0.1"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Stock movement not found");
    }

    @Test
    @DisplayName("revertQuickLog — module disabled: throws BusinessException when STOCK_TRACKING is inactive")
    void revertQuickLogModuleDisabledThrowsBusinessException() {
        when(establishmentConfigService.isModuleEnabled(com.bar.gestioncocktail.model.EstablishmentModule.STOCK_TRACKING)).thenReturn(false);

        assertThatThrownBy(() -> stockMovementService.revertQuickLog(42L, "barman1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("disabled");
    }
}
