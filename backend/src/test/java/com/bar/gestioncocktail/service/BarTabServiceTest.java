package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
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
}
