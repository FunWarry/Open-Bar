package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SupplierCreateRequest;
import com.bar.gestioncocktail.dto.SupplierDTO;
import com.bar.gestioncocktail.service.SupplierService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SupplierController}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierController Unit Tests")
class SupplierControllerTest {

    @Mock
    private SupplierService supplierService;

    @InjectMocks
    private SupplierController supplierController;

    private final SupplierDTO sampleDto = new SupplierDTO(
            1L,
            "Brasserie du Mont-Blanc",
            "Sylvain Favre",
            "contact@montblanc.fr",
            "+33 4 50 00 00 00",
            "125 Rue des Brasseurs, 74000 Annecy",
            "30 days net",
            "Craft beers",
            true,
            LocalDateTime.now().minusDays(5),
            LocalDateTime.now()
    );

    @Test
    @DisplayName("getAllSuppliers - returns full supplier list with HTTP 200")
    void getAllSuppliers_returnsList() {
        when(supplierService.getAllSuppliers()).thenReturn(List.of(sampleDto));

        ResponseEntity<List<SupplierDTO>> response = supplierController.getAllSuppliers();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().nom()).isEqualTo("Brasserie du Mont-Blanc");
        verify(supplierService).getAllSuppliers();
    }

    @Test
    @DisplayName("getActiveSuppliers - returns active suppliers with HTTP 200")
    void getActiveSuppliers_returnsActiveList() {
        when(supplierService.getActiveSuppliers()).thenReturn(List.of(sampleDto));

        ResponseEntity<List<SupplierDTO>> response = supplierController.getActiveSuppliers();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(supplierService).getActiveSuppliers();
    }

    @Test
    @DisplayName("getSupplierById - returns supplier with HTTP 200")
    void getSupplierById_returnsSupplier() {
        when(supplierService.getSupplierById(1L)).thenReturn(sampleDto);

        ResponseEntity<SupplierDTO> response = supplierController.getSupplierById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDto);
        verify(supplierService).getSupplierById(1L);
    }

    @Test
    @DisplayName("createSupplier - delegates to service and returns HTTP 201")
    void createSupplier_createsAndReturns201() {
        SupplierCreateRequest request = new SupplierCreateRequest(
                "Brasserie du Mont-Blanc", null, null, null, null, null, null, true
        );
        when(supplierService.createSupplier(any(SupplierCreateRequest.class))).thenReturn(sampleDto);

        ResponseEntity<SupplierDTO> response = supplierController.createSupplier(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(sampleDto);
        verify(supplierService).createSupplier(request);
    }

    @Test
    @DisplayName("updateSupplier - updates and returns HTTP 200")
    void updateSupplier_updatesAndReturns200() {
        SupplierCreateRequest request = new SupplierCreateRequest(
                "Brasserie du Mont-Blanc SAS", null, null, null, null, null, null, true
        );
        when(supplierService.updateSupplier(eq(1L), any(SupplierCreateRequest.class))).thenReturn(sampleDto);

        ResponseEntity<SupplierDTO> response = supplierController.updateSupplier(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(sampleDto);
        verify(supplierService).updateSupplier(1L, request);
    }

    @Test
    @DisplayName("deleteSupplier - deletes and returns HTTP 204")
    void deleteSupplier_deletesAndReturns204() {
        ResponseEntity<Void> response = supplierController.deleteSupplier(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(supplierService).deleteSupplier(1L);
    }
}
