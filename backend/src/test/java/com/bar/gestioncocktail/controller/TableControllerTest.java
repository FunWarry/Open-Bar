package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PlanSalleDTO;
import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.dto.TableRequestDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.TableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TableControllerTest {

    @Mock
    private TableService tableService;

    @InjectMocks
    private TableController tableController;

    private TableEntity table;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);
        table.setCapacite(4);
        table.setZone("Terrasse");
        table.setOccupee(false);
        table.setPlanX(100.0);
        table.setPlanY(200.0);
    }

    @Test
    @DisplayName("getAllTables - returns all tables")
    void getAllTables_returnsList() {
        when(tableService.getAllTables()).thenReturn(List.of(table));

        List<TableResponseDTO> result = tableController.getAllTables();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).numero()).isEqualTo(5);
    }

    @Test
    @DisplayName("getTableById - returns table when exists, 404 otherwise")
    void getTableById_foundAndNotFound() {
        when(tableService.getTableById(1L)).thenReturn(Optional.of(table));
        when(tableService.getTableById(99L)).thenReturn(Optional.empty());

        ResponseEntity<TableResponseDTO> found = tableController.getTableById(1L);
        ResponseEntity<TableResponseDTO> notFound = tableController.getTableById(99L);

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(found.getBody()).isNotNull();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("getAllZones and getTablesByZone - zone queries")
    void zones_queries() {
        when(tableService.getAllZones()).thenReturn(List.of("Terrasse", "Bar"));
        when(tableService.getTablesByZone("Terrasse")).thenReturn(List.of(table));

        List<String> zones = tableController.getAllZones();
        List<TableResponseDTO> tables = tableController.getTablesByZone("Terrasse");

        assertThat(zones).contains("Terrasse", "Bar");
        assertThat(tables).hasSize(1);
    }

    @Test
    @DisplayName("getTablesByOccupee and getTablesByServeurId - filter queries")
    void filter_queries() {
        when(tableService.getTablesByOccupee(true)).thenReturn(List.of(table));
        when(tableService.getTablesByServeurId(3L)).thenReturn(List.of(table));

        List<TableResponseDTO> occupied = tableController.getTablesByOccupee(true);
        List<TableResponseDTO> byServer = tableController.getTablesByServeurId(3L);

        assertThat(occupied).hasSize(1);
        assertThat(byServer).hasSize(1);
    }

    @Test
    @DisplayName("createTable and updateTable - mutations")
    void mutations() {
        TableRequestDTO request = new TableRequestDTO(5, 4, "Terrasse", 100.0, 200.0, 0.0, "RECTANGLE");
        when(tableService.createTable(any())).thenReturn(table);
        when(tableService.updateTable(eq(1L), any())).thenReturn(table);

        TableResponseDTO created = tableController.createTable(request);
        ResponseEntity<TableResponseDTO> updated = tableController.updateTable(1L, request);

        assertThat(created).isNotNull();
        assertThat(updated.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteTable - deletes table")
    void deleteTable_success() {
        ResponseEntity<Void> response = tableController.deleteTable(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(tableService).deleteTable(1L);
    }

    @Test
    @DisplayName("occuperTable and libererTable - state transitions")
    void occupancy_endpoints() {
        table.setOccupee(true);
        when(tableService.occuperTable(1L, 2L)).thenReturn(table);
        when(tableService.libererTable(1L)).thenReturn(table);

        ResponseEntity<TableResponseDTO> resp1 = tableController.occuperTable(1L, 2L);
        ResponseEntity<TableResponseDTO> resp2 = tableController.libererTable(1L);

        assertThat(resp1.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp2.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("getPlanSalle, updatePosition, and updatePositionsBatch - canvas positioning")
    void planSalle_endpoints() {
        when(tableService.getAllTablesAvecPositions()).thenReturn(List.of(table));
        when(tableService.updatePosition(1L, 50.0, 60.0, 45.0, "ROND")).thenReturn(table);

        List<PlanSalleDTO> plan = tableController.getPlanSalle();
        ResponseEntity<TableResponseDTO> posResp = tableController.updatePosition(1L, 50.0, 60.0, 45.0, "ROND");
        ResponseEntity<Void> batchResp = tableController.updatePositionsBatch(List.of(new TablePositionDTO(1L, 50.0, 60.0, 45.0, "ROND", 80.0, 80.0)));

        assertThat(plan).hasSize(1);
        assertThat(posResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(batchResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("transfererCommandes - transfers orders to target table")
    void transfererCommandes_success() {
        TableEntity target = new TableEntity();
        target.setId(2L);
        target.setNumero(2);
        target.setOccupee(true);

        when(tableService.transfererCommandes(1L, 2L)).thenReturn(target);

        ResponseEntity<?> response = tableController.transfererCommandes(1L, 2L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(tableService).transfererCommandes(1L, 2L);
    }

    @Test
    @DisplayName("getTableQrCode - returns PNG image bytes with proper content type")
    void getTableQrCode_png_returnsImageBytes() {
        when(tableService.generateTableQrCode(1L, "PNG", 300)).thenReturn(new byte[]{1, 2, 3});

        ResponseEntity<byte[]> response = tableController.getTableQrCode(1L, "PNG", 300);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getContentType()).isEqualTo(org.springframework.http.MediaType.IMAGE_PNG);
        assertThat(response.getHeaders().getFirst(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION)).contains("table-1-qrcode.png");
        assertThat(response.getBody()).isEqualTo(new byte[]{1, 2, 3});
    }

    @Test
    @DisplayName("getTableQrCode - returns SVG vector bytes with proper content type")
    void getTableQrCode_svg_returnsSvgBytes() {
        when(tableService.generateTableQrCode(1L, "SVG", 250)).thenReturn("<svg></svg>".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        ResponseEntity<byte[]> response = tableController.getTableQrCode(1L, "SVG", 250);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getContentType()).isEqualTo(org.springframework.http.MediaType.valueOf("image/svg+xml"));
        assertThat(response.getHeaders().getFirst(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION)).contains("table-1-qrcode.svg");
        assertThat(new String(response.getBody())).isEqualTo("<svg></svg>");
    }

    @Test
    @DisplayName("getTableQrCodesPdf - returns PDF bytes with application/pdf content type")
    void getTableQrCodesPdf_nominal_returnsPdf() {
        when(tableService.generateTablesQrCodePdf(List.of(1L, 2L), "STAND", true)).thenReturn(new byte[]{37, 80, 68, 70});

        ResponseEntity<byte[]> response = tableController.getTableQrCodesPdf("STAND", List.of(1L, 2L), true);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getContentType()).isEqualTo(org.springframework.http.MediaType.APPLICATION_PDF);
        assertThat(response.getHeaders().getFirst(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION)).contains("openbar-tables-qrcodes-stand.pdf");
        assertThat(response.getBody()).isEqualTo(new byte[]{37, 80, 68, 70});
    }
}
