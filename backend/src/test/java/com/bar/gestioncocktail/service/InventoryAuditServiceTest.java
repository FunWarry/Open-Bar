package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for {@link InventoryAuditService}.
 */
@ExtendWith(MockitoExtension.class)
class InventoryAuditServiceTest {

    @Mock
    private InventoryAuditSessionRepository sessionRepository;

    @Mock
    private InventoryAuditItemRepository itemRepository;

    @Mock
    private InventoryAuditLocationCountRepository locationCountRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private IngredientService ingredientService;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TimeService timeService;

    @Mock
    private PdfService pdfService;

    @InjectMocks
    private InventoryAuditService inventoryAuditService;

    private User adminUser;
    private Ingredient rumIngredient;
    private Ingredient ginIngredient;
    private InventoryAuditSession draftSession;
    private InventoryAuditItem draftItem;

    @BeforeEach
    void setUp() {
        lenient().when(establishmentConfigService.isModuleEnabled(EstablishmentModule.INVENTORY_AUDIT)).thenReturn(true);
        lenient().when(timeService.now()).thenReturn(LocalDateTime.of(2026, 9, 27, 10, 0, 0));

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setUsername("admin");
        adminUser.setNom("Dupont");
        adminUser.setPrenom("Alex");

        rumIngredient = new Ingredient();
        rumIngredient.setId(10L);
        rumIngredient.setNom("Rhum Blanc Agricole");
        rumIngredient.setUniteMesure("cl");
        rumIngredient.setQuantiteStock(BigDecimal.valueOf(1000.0));
        rumIngredient.setPrixUnitaire(BigDecimal.valueOf(20.00));
        rumIngredient.setCategory("ALCOHOL");
        rumIngredient.setPackagingCapacity(BigDecimal.valueOf(70.0));

        ginIngredient = new Ingredient();
        ginIngredient.setId(11L);
        ginIngredient.setNom("Gin Artisanal");
        ginIngredient.setUniteMesure("cl");
        ginIngredient.setQuantiteStock(BigDecimal.valueOf(500.0));
        ginIngredient.setPrixUnitaire(BigDecimal.valueOf(25.00));
        ginIngredient.setCategory("ALCOHOL");
        ginIngredient.setPackagingCapacity(BigDecimal.valueOf(70.0));

        draftSession = new InventoryAuditSession();
        draftSession.setId(100L);
        draftSession.setReferenceCode("INV-20260927-001");
        draftSession.setTitle("Monthly Alcohol Audit");
        draftSession.setStatus(InventoryAuditStatus.IN_PROGRESS);
        draftSession.setCreatedBy(adminUser);
        draftSession.setCreatedAt(LocalDateTime.of(2026, 9, 27, 10, 0, 0));
        draftSession.setItems(new ArrayList<>());

        draftItem = new InventoryAuditItem();
        draftItem.setId(200L);
        draftItem.setSession(draftSession);
        draftItem.setIngredient(rumIngredient);
        draftItem.setTheoreticalQuantity(BigDecimal.valueOf(1000.0));
        draftItem.setUnitCostHt(BigDecimal.valueOf(20.00));
        draftItem.setTheoreticalValueHt(BigDecimal.valueOf(20000.00));
        draftItem.setLocationCounts(new ArrayList<>());
        draftSession.getItems().add(draftItem);
    }

    @Test
    @DisplayName("createSession should throw exception when module is disabled")
    void createSession_shouldThrowException_whenModuleDisabled() {
        doThrow(new BusinessException("Inventory audit module is disabled"))
                .when(establishmentConfigService).checkModuleEnabled(EstablishmentModule.INVENTORY_AUDIT);

        CreateInventoryAuditSessionDTO request = new CreateInventoryAuditSessionDTO(
                "Test Audit", "ALL", "ALCOHOL", "Notes"
        );

        assertThatThrownBy(() -> inventoryAuditService.createSession(request, "admin"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Inventory audit module is disabled");
    }

    @Test
    @DisplayName("createSession should create session and snapshot matching ingredients")
    void createSession_shouldCreateSessionAndSnapshotIngredients() {
        CreateInventoryAuditSessionDTO request = new CreateInventoryAuditSessionDTO(
                "Monthly Spirits Audit", "ALL", "ALCOHOL", "Initial notes"
        );

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(ingredientRepository.findAll()).thenReturn(List.of(rumIngredient, ginIngredient));
        when(sessionRepository.findAll()).thenReturn(List.of());
        when(sessionRepository.save(any(InventoryAuditSession.class))).thenAnswer(invocation -> {
            InventoryAuditSession s = invocation.getArgument(0);
            s.setId(101L);
            return s;
        });

        InventoryAuditSessionResponseDTO response = inventoryAuditService.createSession(request, "admin");

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(101L);
        assertThat(response.referenceCode()).startsWith("INV-20260927-");
        assertThat(response.totalItemsCount()).isEqualTo(2);

        verify(sessionRepository).save(any(InventoryAuditSession.class));
    }

    @Test
    @DisplayName("getSessionById should throw ResourceNotFoundException when session not found")
    void getSessionById_shouldThrowNotFound_whenMissing() {
        when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryAuditService.getSessionById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Inventory audit session not found");
    }

    @Test
    @DisplayName("getSessionById should return mapped DTO when session exists")
    void getSessionById_shouldReturnDTO_whenExists() {
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));

        InventoryAuditSessionResponseDTO result = inventoryAuditService.getSessionById(100L);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(100L);
        assertThat(result.referenceCode()).isEqualTo("INV-20260927-001");
    }

    @Test
    @DisplayName("updateItemCount should update location entry and recalculate item variance")
    void updateItemCount_shouldUpdateLocationEntryAndRecalculate() {
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));
        when(itemRepository.findById(200L)).thenReturn(Optional.of(draftItem));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(itemRepository.save(any(InventoryAuditItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(InventoryAuditSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(locationCountRepository.findByAuditItemIdAndStorageLocation(eq(200L), anyString())).thenReturn(Optional.empty());

        UpdateInventoryAuditItemCountDTO updateRequest = new UpdateInventoryAuditItemCountDTO(
                "MAIN_BAR", 2, BigDecimal.valueOf(35.0), "Counted with team"
        );

        InventoryAuditItemResponseDTO response = inventoryAuditService.updateItemCount(100L, 200L, updateRequest, "admin");

        assertThat(response).isNotNull();
        verify(locationCountRepository).save(any(InventoryAuditLocationCount.class));
    }

    @Test
    @DisplayName("updateItemCount should throw BusinessException when session is finalized")
    void updateItemCount_shouldThrow_whenSessionFinalized() {
        draftSession.setStatus(InventoryAuditStatus.FINALIZED);
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));

        UpdateInventoryAuditItemCountDTO updateRequest = new UpdateInventoryAuditItemCountDTO(
                "MAIN_BAR", 1, BigDecimal.ZERO, "Notes"
        );

        assertThatThrownBy(() -> inventoryAuditService.updateItemCount(100L, 200L, updateRequest, "admin"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot modify counts in a FINALIZED session");
    }

    @Test
    @DisplayName("finalizeSession should adjust stock balance, log stock movements and mark finalized")
    void finalizeSession_shouldAdjustStockAndLogMovements() {
        InventoryAuditLocationCount loc = new InventoryAuditLocationCount();
        loc.setAuditItem(draftItem);
        loc.setStorageLocation("MAIN_BAR");
        loc.setFullContainersCount(13);
        loc.setPartialQuantity(BigDecimal.valueOf(40.0));
        loc.setCountedQuantity(BigDecimal.valueOf(950.0));
        draftItem.setLocationCounts(new ArrayList<>(List.of(loc)));

        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(sessionRepository.save(any(InventoryAuditSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InventoryAuditSessionResponseDTO finalized = inventoryAuditService.finalizeSession(100L, "admin", "127.0.0.1");

        assertThat(finalized).isNotNull();
        assertThat(finalized.status()).isEqualTo(InventoryAuditStatus.FINALIZED);

        verify(ingredientService).updateStock(eq(rumIngredient), argThat(qty -> qty.compareTo(BigDecimal.valueOf(950.0)) == 0));
        verify(stockMovementRepository).save(argThat(movement ->
                movement.getReason() == StockWasteReason.INVENTORY_ADJUSTMENT &&
                movement.getQuantity().compareTo(BigDecimal.valueOf(50.0)) == 0
        ));
        verify(auditLogService).logAction(eq(adminUser), eq("INVENTORY_AUDIT_FINALIZED"), eq("InventoryAuditSession"), eq(100L), anyString(), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("finalizeSession should log INVENTORY_SURPLUS when variance is positive")
    void finalizeSession_shouldLogSurplus_whenVariancePositive() {
        InventoryAuditLocationCount loc = new InventoryAuditLocationCount();
        loc.setAuditItem(draftItem);
        loc.setStorageLocation("MAIN_BAR");
        loc.setFullContainersCount(15);
        loc.setPartialQuantity(BigDecimal.ZERO);
        loc.setCountedQuantity(BigDecimal.valueOf(1050.0));
        draftItem.setLocationCounts(new ArrayList<>(List.of(loc)));

        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(sessionRepository.save(any(InventoryAuditSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InventoryAuditSessionResponseDTO finalized = inventoryAuditService.finalizeSession(100L, "admin", "127.0.0.1");

        assertThat(finalized).isNotNull();
        assertThat(finalized.status()).isEqualTo(InventoryAuditStatus.FINALIZED);

        verify(ingredientService).updateStock(eq(rumIngredient), argThat(qty -> qty.compareTo(BigDecimal.valueOf(1050.0)) == 0));
        verify(stockMovementRepository).save(argThat(movement ->
                movement.getReason() == StockWasteReason.INVENTORY_SURPLUS &&
                movement.getQuantity().compareTo(BigDecimal.valueOf(50.0)) == 0
        ));
    }

    @Test
    @DisplayName("cancelSession should mark session as CANCELLED")
    void cancelSession_shouldMarkCancelled() {
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));
        when(sessionRepository.save(any(InventoryAuditSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InventoryAuditSessionResponseDTO cancelled = inventoryAuditService.cancelSession(100L, "admin");

        assertThat(cancelled.status()).isEqualTo(InventoryAuditStatus.CANCELLED);
    }

    @Test
    @DisplayName("exportCsv should generate RFC-4180 compliant CSV stream")
    void exportCsv_shouldGenerateRfc4180Csv() {
        draftItem.setCountedQuantity(BigDecimal.valueOf(950.0));
        draftItem.setVarianceQuantity(BigDecimal.valueOf(-50.0));
        draftItem.setVarianceValueHt(BigDecimal.valueOf(-1000.00));

        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));

        byte[] csvBytes = inventoryAuditService.exportCsv(100L);

        assertThat(csvBytes).isNotEmpty();
        String csvContent = new String(csvBytes);
        assertThat(csvContent).contains("Reference;Title;Status", "Rhum Blanc Agricole", "INV-20260927-001");
    }

    @Test
    @DisplayName("exportPdf should delegate to PdfService")
    void exportPdf_shouldDelegateToPdfService() {
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(draftSession));
        when(pdfService.generateInventoryAuditPdf(any(InventoryAuditSession.class))).thenReturn(new byte[]{1, 2, 3});

        byte[] pdf = inventoryAuditService.exportPdf(100L);

        assertThat(pdf).containsExactly(1, 2, 3);
        verify(pdfService).generateInventoryAuditPdf(draftSession);
    }
}
