package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.BarTabCreateRequest;
import com.bar.gestioncocktail.dto.BarTabDetailResponseDTO;
import com.bar.gestioncocktail.dto.BarTabOrderTransferRequest;
import com.bar.gestioncocktail.dto.BarTabResponseDTO;
import com.bar.gestioncocktail.dto.BarTabTransferRequest;
import com.bar.gestioncocktail.dto.BarTabUpdateRequest;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.BarTab;
import com.bar.gestioncocktail.model.BarTabStatus;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.BarTabRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for {@link BarTabService}.
 */
@ExtendWith(MockitoExtension.class)
class BarTabServiceTest {

    @Mock
    private BarTabRepository barTabRepository;

    @Mock
    private CommandeRepository commandeRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private CommandeService commandeService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private BarTabService barTabService;

    private User sampleUser;
    private BarTab sampleTab;

    @BeforeEach
    void setUp() {
        lenient().when(establishmentConfigService.isModuleEnabled(EstablishmentModule.BAR_TABS)).thenReturn(true);
        lenient().when(timeService.getZoneId()).thenReturn(ZoneId.of("Europe/Paris"));
        lenient().when(timeService.now()).thenReturn(LocalDateTime.now(ZoneId.of("Europe/Paris")));

        sampleUser = new User();
        sampleUser.setId(10L);
        sampleUser.setUsername("serveur1");

        sampleTab = new BarTab();
        sampleTab.setId(1L);
        sampleTab.setNom("VIP Mark");
        sampleTab.setClientReference("CB-9921");
        sampleTab.setCautionMontant(new BigDecimal("50.00"));
        sampleTab.setStatut(BarTabStatus.ACTIVE);
        sampleTab.setOpenedAt(LocalDateTime.now(ZoneId.of("Europe/Paris")));
        sampleTab.setServeur(sampleUser);
    }

    @Test
    @DisplayName("createTab - throws BusinessException when BAR_TABS module is disabled")
    void createTab_moduleDisabled_throwsException() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.BAR_TABS)).thenReturn(false);
        BarTabCreateRequest request = new BarTabCreateRequest("Mark", null, null, null, null);

        assertThatThrownBy(() -> barTabService.createTab(request, sampleUser))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Bar Tabs module");
    }

    @Test
    @DisplayName("createTab - successfully persists and notifies on tab creation")
    void createTab_success() {
        BarTabCreateRequest request = new BarTabCreateRequest("VIP Mark", "CB-9921", "Allergic to nuts", new BigDecimal("50.00"), null);
        when(barTabRepository.save(any(BarTab.class))).thenAnswer(inv -> {
            BarTab t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });

        BarTabResponseDTO result = barTabService.createTab(request, sampleUser);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.nom()).isEqualTo("VIP Mark");
        assertThat(result.statut()).isEqualTo(BarTabStatus.ACTIVE);
        verify(barTabRepository).save(any(BarTab.class));
        verify(notificationService).notifierBarTabMisAJour(any(BarTabResponseDTO.class));
    }

    @Test
    @DisplayName("updateTab - successfully updates metadata")
    void updateTab_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        when(barTabRepository.save(any(BarTab.class))).thenReturn(sampleTab);

        BarTabUpdateRequest updateRequest = new BarTabUpdateRequest("Updated Name", "CB-NEW", "Updated Notes", new BigDecimal("75.00"));
        BarTabResponseDTO updated = barTabService.updateTab(1L, updateRequest);

        assertThat(updated).isNotNull();
        assertThat(sampleTab.getNom()).isEqualTo("Updated Name");
        assertThat(sampleTab.getClientReference()).isEqualTo("CB-NEW");
        assertThat(sampleTab.getCautionMontant()).isEqualByComparingTo("75.00");
        verify(notificationService).notifierBarTabMisAJour(any(BarTabResponseDTO.class));
    }

    @Test
    @DisplayName("cancelTab - throws BusinessException when tab has active orders")
    void cancelTab_withActiveOrders_throwsException() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        Commande activeOrder = new Commande();
        activeOrder.setId(100L);
        activeOrder.setStatut(CommandeStatut.EN_PREPARATION);
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(activeOrder));

        assertThatThrownBy(() -> barTabService.cancelTab(1L, "Test cancel"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("active unbilled orders");
    }

    @Test
    @DisplayName("cancelTab - cancels tab when no active orders are present")
    void cancelTab_emptyOrders_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());
        when(barTabRepository.save(any(BarTab.class))).thenReturn(sampleTab);

        BarTabResponseDTO res = barTabService.cancelTab(1L, "Customer left");

        assertThat(res).isNotNull();
        assertThat(sampleTab.getStatut()).isEqualTo(BarTabStatus.CANCELLED);
        verify(notificationService).notifierBarTabMisAJour(any(BarTabResponseDTO.class));
    }

    @Test
    @DisplayName("getTabDetail - consolidates items and totals across orders")
    void getTabDetail_success() {
        when(barTabRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleTab));

        Cocktail mojito = new Cocktail();
        mojito.setId(5L);
        mojito.setNom("Mojito");

        CommandeItem item1 = new CommandeItem();
        item1.setCocktail(mojito);
        item1.setQuantite(2);
        item1.setPrixUnitaire(new BigDecimal("8.00"));

        Commande order1 = new Commande();
        order1.setId(101L);
        order1.setTotal(new BigDecimal("16.00"));
        order1.setItems(new ArrayList<>(List.of(item1)));

        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(order1));

        BarTabDetailResponseDTO detail = barTabService.getTabDetail(1L);

        assertThat(detail).isNotNull();
        assertThat(detail.items()).hasSize(1);
        assertThat(detail.items().get(0).cocktailNom()).isEqualTo("Mojito");
        assertThat(detail.items().get(0).quantite()).isEqualTo(2);
        assertThat(detail.totalTTC()).isEqualByComparingTo("16.00");
    }

    @Test
    @DisplayName("transferTabToTable - transfers orders to target table and updates status to TRANSFERRED")
    void transferTabToTable_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        TableEntity targetTable = new TableEntity();
        targetTable.setId(3L);
        targetTable.setNumero(3);
        when(tableRepository.findById(3L)).thenReturn(Optional.of(targetTable));

        Commande order = new Commande();
        order.setId(102L);
        order.setStatut(CommandeStatut.EN_PREPARATION);
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(order));
        when(barTabRepository.save(any(BarTab.class))).thenReturn(sampleTab);

        BarTabTransferRequest req = new BarTabTransferRequest(3L, null, false);
        BarTabResponseDTO res = barTabService.transferTabToTable(1L, req);

        assertThat(res).isNotNull();
        assertThat(order.getTable()).isEqualTo(targetTable);
        assertThat(order.getBarTab()).isNull();
        assertThat(sampleTab.getStatut()).isEqualTo(BarTabStatus.TRANSFERRED);
        verify(tableRepository).save(targetTable);
        verify(barTabRepository).save(sampleTab);
    }

    @Test
    @DisplayName("transferOrdersFromTable - transfers active table orders onto tab")
    void transferOrdersFromTable_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        TableEntity sourceTable = new TableEntity();
        sourceTable.setId(4L);
        sourceTable.setNumero(4);
        sourceTable.setOccupee(true);
        when(tableRepository.findById(4L)).thenReturn(Optional.of(sourceTable));

        Commande tableOrder = new Commande();
        tableOrder.setId(103L);
        tableOrder.setTable(sourceTable);
        tableOrder.setStatut(CommandeStatut.LIVREE);
        when(commandeRepository.findByTable(sourceTable)).thenReturn(List.of(tableOrder));
        when(barTabRepository.save(any(BarTab.class))).thenReturn(sampleTab);

        BarTabTransferRequest req = new BarTabTransferRequest(4L, null, true);
        BarTabResponseDTO res = barTabService.transferOrdersFromTable(1L, req);

        assertThat(res).isNotNull();
        assertThat(tableOrder.getBarTab()).isEqualTo(sampleTab);
        assertThat(tableOrder.getTable()).isNull();
        assertThat(sourceTable.isOccupee()).isFalse();
        verify(tableRepository).save(sourceTable);
    }

    @Test
    @DisplayName("createTab - without user overload")
    void createTab_withoutUser_success() {
        BarTabCreateRequest request = new BarTabCreateRequest("Walk-in", "CB-1234", "Note", new BigDecimal("20.00"), null);
        when(barTabRepository.save(any(BarTab.class))).thenAnswer(inv -> {
            BarTab t = inv.getArgument(0);
            t.setId(2L);
            return t;
        });

        BarTabResponseDTO res = barTabService.createTab(request);
        assertThat(res).isNotNull();
        assertThat(res.id()).isEqualTo(2L);
        assertThat(res.nom()).isEqualTo("Walk-in");
    }

    @Test
    @DisplayName("createTab - blank name throws BusinessException")
    void createTab_blankName_throwsBusinessException() {
        BarTabCreateRequest request = new BarTabCreateRequest("   ", null, null, null, null);
        assertThatThrownBy(() -> barTabService.createTab(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Tab name cannot be empty");
    }

    @Test
    @DisplayName("createTab - with tableOriginaleId sets tableOriginale")
    void createTab_withTableOriginale_success() {
        TableEntity origTable = new TableEntity();
        origTable.setId(9L);
        when(tableRepository.findById(9L)).thenReturn(Optional.of(origTable));
        when(barTabRepository.save(any(BarTab.class))).thenAnswer(inv -> {
            BarTab t = inv.getArgument(0);
            t.setId(3L);
            return t;
        });

        BarTabCreateRequest request = new BarTabCreateRequest("Tab Table 9", null, null, null, 9L);
        BarTabResponseDTO res = barTabService.createTab(request, sampleUser);
        assertThat(res).isNotNull();
        verify(tableRepository).findById(9L);
    }

    @Test
    @DisplayName("getTabsByStatus - returns tabs filtered by status")
    void getTabsByStatus_success() {
        when(barTabRepository.findByStatutOrderByIdDesc(BarTabStatus.ACTIVE)).thenReturn(List.of(sampleTab));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());

        List<BarTabResponseDTO> res = barTabService.getTabsByStatus(BarTabStatus.ACTIVE);
        assertThat(res).hasSize(1);
        assertThat(res.get(0).id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getActiveTabs - returns active tabs with calculated total and counts")
    void getActiveTabs_success() {
        when(barTabRepository.findByStatutOrderByIdDesc(BarTabStatus.ACTIVE)).thenReturn(List.of(sampleTab));

        Commande cmd = new Commande();
        cmd.setId(201L);
        cmd.setStatut(CommandeStatut.EN_PREPARATION);
        cmd.setTotal(new BigDecimal("22.50"));
        CommandeItem item = new CommandeItem();
        item.setQuantite(2);
        cmd.setItems(new ArrayList<>(List.of(item)));

        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(cmd));

        List<BarTabResponseDTO> res = barTabService.getActiveTabs();
        assertThat(res).hasSize(1);
        assertThat(res.get(0).total()).isEqualByComparingTo("22.50");
        assertThat(res.get(0).activeOrdersCount()).isEqualTo(1);
        assertThat(res.get(0).itemsCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("getTabById - returns tab when found")
    void getTabById_success() {
        when(barTabRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleTab));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());

        BarTabResponseDTO res = barTabService.getTabById(1L);
        assertThat(res).isNotNull();
        assertThat(res.id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getTabById - throws ResourceNotFoundException when not found")
    void getTabById_notFound_throwsException() {
        when(barTabRepository.findDetailedById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> barTabService.getTabById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getTabDetail - throws ResourceNotFoundException when not found")
    void getTabDetail_notFound_throwsException() {
        when(barTabRepository.findDetailedById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> barTabService.getTabDetail(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getTabDetails - alias calls getTabDetail")
    void getTabDetails_alias_success() {
        when(barTabRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleTab));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());

        BarTabDetailResponseDTO res = barTabService.getTabDetails(1L);
        assertThat(res).isNotNull();
    }

    @Test
    @DisplayName("getTabDetail - with item variants and settled orders excluded")
    void getTabDetail_withVariantsAndFilteredOrders() {
        when(barTabRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleTab));

        Cocktail ginTonic = new Cocktail();
        ginTonic.setId(7L);
        ginTonic.setNom("Gin Tonic");

        CocktailVariante variante = new CocktailVariante();
        variante.setId(12L);
        variante.setNom("Bombay");

        CommandeItem item = new CommandeItem();
        item.setCocktail(ginTonic);
        item.setVariante(variante);
        item.setQuantite(3);
        item.setPrixUnitaire(new BigDecimal("10.00"));
        item.setNotes("Extra lime");

        Commande activeCmd = new Commande();
        activeCmd.setId(301L);
        activeCmd.setStatut(CommandeStatut.EN_PREPARATION);
        activeCmd.setTotal(new BigDecimal("30.00"));
        activeCmd.setItems(new ArrayList<>(List.of(item)));

        Commande regleeCmd = new Commande();
        regleeCmd.setId(302L);
        regleeCmd.setStatut(CommandeStatut.REGLEE);
        regleeCmd.setTotal(new BigDecimal("50.00"));

        Commande annuleeCmd = new Commande();
        annuleeCmd.setId(303L);
        annuleeCmd.setStatut(CommandeStatut.ANNULEE);
        annuleeCmd.setTotal(new BigDecimal("15.00"));

        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(activeCmd, regleeCmd, annuleeCmd));

        BarTabDetailResponseDTO detail = barTabService.getTabDetail(1L);
        assertThat(detail.activeCommandes()).hasSize(1);
        assertThat(detail.items()).hasSize(1);
        assertThat(detail.items().get(0).varianteNom()).isEqualTo("Bombay");
        assertThat(detail.items().get(0).notes()).isEqualTo("Extra lime");
        assertThat(detail.totalTTC()).isEqualByComparingTo("30.00");
    }

    @Test
    @DisplayName("updateTab - throws BusinessException when tab is not active")
    void updateTab_notActive_throwsException() {
        sampleTab.setStatut(BarTabStatus.SETTLED);
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));

        BarTabUpdateRequest updateRequest = new BarTabUpdateRequest("New", null, null, null);
        assertThatThrownBy(() -> barTabService.updateTab(1L, updateRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot update non-active bar tab");
    }

    @Test
    @DisplayName("updateTab - throws ResourceNotFoundException when tab not found")
    void updateTab_notFound_throwsException() {
        when(barTabRepository.findById(999L)).thenReturn(Optional.empty());
        BarTabUpdateRequest updateRequest = new BarTabUpdateRequest("New", null, null, null);
        assertThatThrownBy(() -> barTabService.updateTab(999L, updateRequest))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("addOrderToTab - adds order to active tab")
    void addOrderToTab_withEntity_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));

        Commande cmd = new Commande();
        cmd.setId(401L);
        cmd.setStatut(CommandeStatut.EN_ATTENTE);
        cmd.setTotal(new BigDecimal("15.00"));

        when(commandeService.createCommande(cmd)).thenReturn(cmd);
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(cmd));
        when(barTabRepository.save(sampleTab)).thenReturn(sampleTab);

        CommandeResponseDTO dto = barTabService.addOrderToTab(1L, cmd, sampleUser);
        assertThat(dto).isNotNull();
        assertThat(cmd.getBarTab()).isEqualTo(sampleTab);
        assertThat(cmd.getTable()).isNull();
        verify(barTabRepository).save(sampleTab);
    }

    @Test
    @DisplayName("addOrderToTab - throws BusinessException when tab is not active")
    void addOrderToTab_notActive_throwsException() {
        sampleTab.setStatut(BarTabStatus.CANCELLED);
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));

        Commande cmd = new Commande();
        assertThatThrownBy(() -> barTabService.addOrderToTab(1L, cmd, sampleUser))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot add orders to non-active bar tab");
    }

    @Test
    @DisplayName("addOrderToTab - request DTO overload")
    void addOrderToTab_withRequestDTO_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));

        CommandeRequestDTO requestDTO = new CommandeRequestDTO(null, 1L, null, "Notes", null, null, List.of());
        Commande created = new Commande();
        created.setId(402L);
        created.setStatut(CommandeStatut.EN_ATTENTE);
        created.setTotal(BigDecimal.TEN);

        when(commandeService.createCommande(any(Commande.class))).thenReturn(created);
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of(created));
        when(barTabRepository.save(sampleTab)).thenReturn(sampleTab);

        CommandeResponseDTO dto = barTabService.addOrderToTab(1L, requestDTO);
        assertThat(dto).isNotNull();
    }

    @Test
    @DisplayName("transferTableOrdersToTab - throws BusinessException if table has no active orders")
    void transferTableOrdersToTab_noOrders_throwsException() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        TableEntity table = new TableEntity();
        table.setId(5L);
        table.setNumero(5);
        when(tableRepository.findById(5L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of());

        assertThatThrownBy(() -> barTabService.transferTableOrdersToTab(5L, 1L, true))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No active orders found on table");
    }

    @Test
    @DisplayName("transferTableOrdersToTab - throws BusinessException if tab is not active")
    void transferTableOrdersToTab_notActive_throwsException() {
        sampleTab.setStatut(BarTabStatus.SETTLED);
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        TableEntity table = new TableEntity();
        table.setId(5L);
        when(tableRepository.findById(5L)).thenReturn(Optional.of(table));

        assertThatThrownBy(() -> barTabService.transferTableOrdersToTab(5L, 1L, true))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Target bar tab is not active");
    }

    @Test
    @DisplayName("transferTabOrdersToTable - throws BusinessException if tab has no active orders")
    void transferTabOrdersToTable_noOrders_throwsException() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        TableEntity table = new TableEntity();
        table.setId(6L);
        when(tableRepository.findById(6L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());

        assertThatThrownBy(() -> barTabService.transferTabOrdersToTable(1L, 6L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No active orders found on bar tab");
    }

    @Test
    @DisplayName("transferSingleOrder - throws BusinessException when commandeIds is empty")
    void transferSingleOrder_emptyCmds_throwsException() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        BarTabOrderTransferRequest req = new BarTabOrderTransferRequest(List.of(), null, null, false);

        assertThatThrownBy(() -> barTabService.transferSingleOrder(1L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No order IDs provided for transfer");
    }

    @Test
    @DisplayName("transferSingleOrder - transfers order to target table")
    void transferSingleOrder_toTable_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        TableEntity targetTable = new TableEntity();
        targetTable.setId(8L);
        targetTable.setOccupee(false);
        when(tableRepository.findById(8L)).thenReturn(Optional.of(targetTable));

        Commande cmd = new Commande();
        cmd.setId(501L);
        cmd.setStatut(CommandeStatut.EN_PREPARATION);
        cmd.setTotal(new BigDecimal("18.00"));
        when(commandeRepository.findById(501L)).thenReturn(Optional.of(cmd));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());
        when(barTabRepository.save(sampleTab)).thenReturn(sampleTab);

        BarTabOrderTransferRequest req = new BarTabOrderTransferRequest(List.of(501L), null, 8L, false);
        BarTabResponseDTO res = barTabService.transferSingleOrder(1L, req);

        assertThat(res).isNotNull();
        assertThat(cmd.getTable()).isEqualTo(targetTable);
        assertThat(cmd.getBarTab()).isNull();
        assertThat(targetTable.isOccupee()).isTrue();
        verify(tableRepository).save(targetTable);
        verify(commandeRepository).save(cmd);
    }

    @Test
    @DisplayName("transferSingleOrder - transfers order to target tab")
    void transferSingleOrder_toTargetTab_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        BarTab targetTab = new BarTab();
        targetTab.setId(2L);
        targetTab.setNom("Target Tab");
        when(barTabRepository.findById(2L)).thenReturn(Optional.of(targetTab));

        Commande cmd = new Commande();
        cmd.setId(502L);
        cmd.setStatut(CommandeStatut.EN_PREPARATION);
        cmd.setTotal(new BigDecimal("25.00"));
        when(commandeRepository.findById(502L)).thenReturn(Optional.of(cmd));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());
        when(barTabRepository.save(sampleTab)).thenReturn(sampleTab);

        BarTabOrderTransferRequest req = new BarTabOrderTransferRequest(List.of(502L), 2L, null, false);
        BarTabResponseDTO res = barTabService.transferSingleOrder(1L, req);

        assertThat(res).isNotNull();
        assertThat(cmd.getBarTab()).isEqualTo(targetTab);
        assertThat(cmd.getTable()).isNull();
        verify(commandeRepository).save(cmd);
    }

    @Test
    @DisplayName("cancelTab - overload without reason")
    void cancelTab_withoutReason_success() {
        when(barTabRepository.findById(1L)).thenReturn(Optional.of(sampleTab));
        when(commandeRepository.findByBarTab(sampleTab)).thenReturn(List.of());
        when(barTabRepository.save(any(BarTab.class))).thenReturn(sampleTab);

        BarTabResponseDTO res = barTabService.cancelTab(1L);
        assertThat(res).isNotNull();
        assertThat(sampleTab.getStatut()).isEqualTo(BarTabStatus.CANCELLED);
    }
}
