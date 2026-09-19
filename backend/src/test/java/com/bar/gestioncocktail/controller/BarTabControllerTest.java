package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.BarTabCreateRequest;
import com.bar.gestioncocktail.dto.BarTabDetailResponseDTO;
import com.bar.gestioncocktail.dto.BarTabOrderTransferRequest;
import com.bar.gestioncocktail.dto.BarTabResponseDTO;
import com.bar.gestioncocktail.dto.BarTabTransferRequest;
import com.bar.gestioncocktail.dto.BarTabUpdateRequest;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.dto.EncaissementRequestDTO;
import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.dto.TableAdditionResponseDTO;
import com.bar.gestioncocktail.model.BarTabStatus;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.service.BarTabService;
import com.bar.gestioncocktail.service.FactureService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link BarTabController}.
 */
@ExtendWith(MockitoExtension.class)
class BarTabControllerTest {

    @Mock
    private BarTabService barTabService;

    @Mock
    private FactureService factureService;

    @InjectMocks
    private BarTabController barTabController;

    private final BarTabResponseDTO sampleDTO = new BarTabResponseDTO(
            1L,
            "VIP Mark",
            "CB-9921",
            "Notes",
            new BigDecimal("50.00"),
            BarTabStatus.ACTIVE,
            10L,
            "serveur1",
            (Long) null,
            (Integer) null,
            LocalDateTime.now(),
            (LocalDateTime) null,
            new BigDecimal("16.00"),
            1,
            2
    );

    @Test
    @DisplayName("getAllTabs - returns list of tabs")
    void getAllTabs_returnsList() {
        when(barTabService.getTabsByStatus(BarTabStatus.ACTIVE)).thenReturn(List.of(sampleDTO));

        List<BarTabResponseDTO> response = barTabController.getAllTabs(BarTabStatus.ACTIVE);

        assertThat(response).containsExactly(sampleDTO);
        verify(barTabService).getTabsByStatus(BarTabStatus.ACTIVE);
    }

    @Test
    @DisplayName("getTabById - returns tab detail with consolidated breakdown")
    void getTabById_returnsDetail() {
        BarTabDetailResponseDTO detailDTO = new BarTabDetailResponseDTO(
                sampleDTO,
                List.of(),
                List.of(),
                new BigDecimal("13.33"),
                new BigDecimal("2.67"),
                new BigDecimal("16.00"),
                45
        );
        when(barTabService.getTabDetails(1L)).thenReturn(detailDTO);

        ResponseEntity<BarTabDetailResponseDTO> response = barTabController.getTabById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(detailDTO);
        verify(barTabService).getTabDetails(1L);
    }

    @Test
    @DisplayName("createTab - creates tab successfully")
    void createTab_createsSuccessfully() {
        BarTabCreateRequest req = new BarTabCreateRequest("VIP Mark", "CB-9921", "Notes", new BigDecimal("50.00"), null);
        when(barTabService.createTab(req)).thenReturn(sampleDTO);

        ResponseEntity<BarTabResponseDTO> response = barTabController.createTab(req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(sampleDTO);
        verify(barTabService).createTab(req);
    }

    @Test
    @DisplayName("updateTab - delegates to service")
    void updateTab_delegates() {
        BarTabUpdateRequest req = new BarTabUpdateRequest("Updated Name", null, null, null);
        when(barTabService.updateTab(1L, req)).thenReturn(sampleDTO);

        ResponseEntity<BarTabResponseDTO> response = barTabController.updateTab(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDTO);
        verify(barTabService).updateTab(1L, req);
    }

    @Test
    @DisplayName("cancelTab - delegates to service")
    void cancelTab_delegates() {
        when(barTabService.cancelTab(1L, "Left early")).thenReturn(sampleDTO);

        ResponseEntity<BarTabResponseDTO> response = barTabController.cancelTab(1L, "Left early");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDTO);
        verify(barTabService).cancelTab(1L, "Left early");
    }

    @Test
    @DisplayName("getTabAddition - delegates to FactureService")
    void getTabAddition_delegates() {
        TableAdditionResponseDTO addition = new TableAdditionResponseDTO(
                null, null, "Ardoises", 10L, "serveur1", null,
                List.of(), List.of(100L), new BigDecimal("10.00"), new BigDecimal("2.00"), new BigDecimal("12.00"), 1, false, null,
                1L, "VIP Mark"
        );
        when(factureService.getTabAddition(1L)).thenReturn(addition);

        ResponseEntity<TableAdditionResponseDTO> response = barTabController.getTabAddition(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(addition);
        verify(factureService).getTabAddition(1L);
    }

    @Test
    @DisplayName("encaisserTab - delegates settlement to FactureService")
    void encaisserTab_delegates() {
        EncaissementRequestDTO req = new EncaissementRequestDTO("CARTE", BigDecimal.ZERO, null, null, null, null, true, List.of(100L));
        FactureResponseDTO invoice = new FactureResponseDTO(
                500L,
                null,
                null,
                "FAC-2026-00001",
                new BigDecimal("12.00"),
                new BigDecimal("10.00"),
                new BigDecimal("2.00"),
                BigDecimal.ZERO,
                new BigDecimal("12.00"),
                LocalDateTime.now(),
                LocalDateTime.now(),
                true,
                "CARTE",
                null,
                List.of(),
                List.of(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        when(factureService.encaisserTab(1L, req)).thenReturn(invoice);

        ResponseEntity<FactureResponseDTO> response = barTabController.encaisserTab(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().numero()).isEqualTo("FAC-2026-00001");
        verify(factureService).encaisserTab(1L, req);
    }

    @Test
    @DisplayName("getAllTabs - with null status defaults to getActiveTabs")
    void getAllTabs_withNullStatus_callsGetActiveTabs() {
        when(barTabService.getActiveTabs()).thenReturn(List.of(sampleDTO));

        List<BarTabResponseDTO> response = barTabController.getAllTabs(null);

        assertThat(response).containsExactly(sampleDTO);
        verify(barTabService).getActiveTabs();
    }

    @Test
    @DisplayName("addOrderToTab - adds order to bar tab")
    void addOrderToTab_success() {
        CommandeRequestDTO req = new CommandeRequestDTO(null, 1L, null, "Notes", null, null, List.of());
        Commande cmd = new Commande();
        cmd.setId(100L);
        CommandeResponseDTO orderDTO = CommandeResponseDTO.from(cmd);
        when(barTabService.addOrderToTab(1L, req)).thenReturn(orderDTO);

        ResponseEntity<CommandeResponseDTO> response = barTabController.addOrderToTab(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(orderDTO);
        verify(barTabService).addOrderToTab(1L, req);
    }

    @Test
    @DisplayName("transferFromTable - transfers orders from table to tab")
    void transferFromTable_success() {
        BarTabTransferRequest req = new BarTabTransferRequest(3L, null, true);
        when(barTabService.transferOrdersFromTable(1L, req)).thenReturn(sampleDTO);

        ResponseEntity<BarTabResponseDTO> response = barTabController.transferFromTable(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDTO);
        verify(barTabService).transferOrdersFromTable(1L, req);
    }

    @Test
    @DisplayName("transferToTable - transfers orders from tab to table")
    void transferToTable_success() {
        BarTabTransferRequest req = new BarTabTransferRequest(4L, null, false);
        when(barTabService.transferTabToTable(1L, req)).thenReturn(sampleDTO);

        ResponseEntity<BarTabResponseDTO> response = barTabController.transferToTable(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDTO);
        verify(barTabService).transferTabToTable(1L, req);
    }

    @Test
    @DisplayName("transferSingleOrder - transfers single order")
    void transferSingleOrder_success() {
        BarTabOrderTransferRequest req = new BarTabOrderTransferRequest(List.of(100L), null, 5L, false);
        when(barTabService.transferSingleOrder(1L, req)).thenReturn(sampleDTO);

        ResponseEntity<BarTabResponseDTO> response = barTabController.transferSingleOrder(1L, req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDTO);
        verify(barTabService).transferSingleOrder(1L, req);
    }
}
