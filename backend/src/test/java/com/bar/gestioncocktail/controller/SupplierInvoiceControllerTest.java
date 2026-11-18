package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.SupplierInvoiceRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.InvoiceReconciliationService;
import com.bar.gestioncocktail.service.SupplierInvoiceParserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SupplierInvoiceController} verifying REST endpoints for
 * Factur-X/PDF invoice upload, reconciliation diff preview, draft saving, stock apply,
 * compliance reporting, XML download, and invoice deletion.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierInvoiceController Unit Tests")
class SupplierInvoiceControllerTest {

    @Mock
    private SupplierInvoiceParserService invoiceParserService;

    @Mock
    private InvoiceReconciliationService reconciliationService;

    @Mock
    private SupplierInvoiceRepository supplierInvoiceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private SupplierInvoiceController invoiceController;

    private SupplierInvoice sampleInvoice;
    private SupplierInvoiceDTO sampleInvoiceDto;

    @BeforeEach
    void setUp() {
        Supplier supplier = new Supplier();
        supplier.setId(10L);
        supplier.setNom("METRO France");
        supplier.setSiren("399315613");
        supplier.setSiret("39931561300010");
        supplier.setVatNumber("FR12399315613");

        sampleInvoice = new SupplierInvoice();
        sampleInvoice.setId(1L);
        sampleInvoice.setInvoiceNumber("FA-2026-089");
        sampleInvoice.setSupplier(supplier);
        sampleInvoice.setSupplierNameRaw("METRO France");
        sampleInvoice.setSupplierSiren("399315613");
        sampleInvoice.setSupplierSiret("39931561300010");
        sampleInvoice.setSupplierVatNumber("FR12399315613");
        sampleInvoice.setInvoiceDate(LocalDate.of(2026, 3, 10));
        sampleInvoice.setTotalHt(new BigDecimal("214.50"));
        sampleInvoice.setTotalVat(new BigDecimal("42.90"));
        sampleInvoice.setTotalTtc(new BigDecimal("257.40"));
        sampleInvoice.setStatus(SupplierInvoiceStatus.PENDING_REVIEW);
        sampleInvoice.setFormat(SupplierInvoiceFormat.FACTUR_X);
        sampleInvoice.setLegalComplianceStatus(SupplierInvoiceComplianceStatus.COMPLIANT);
        sampleInvoice.setFileName("factur-x.xml");
        sampleInvoice.setFileChecksum("a1b2c3d4");
        sampleInvoice.setRawXmlContent("<rsm:CrossIndustryInvoice/>");

        sampleInvoiceDto = SupplierInvoiceDTO.from(sampleInvoice);
    }

    @Nested
    @DisplayName("Upload Invoice")
    class UploadTests {

        @Test
        @DisplayName("Should upload and parse invoice successfully returning 201 Created")
        void shouldUploadInvoiceSuccessfully() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "factur-x.xml", "application/xml", "<xml/>".getBytes()
            );

            when(invoiceParserService.parseInvoice(file)).thenReturn(sampleInvoice);
            when(supplierInvoiceRepository.findByFileChecksum("a1b2c3d4")).thenReturn(Optional.empty());
            when(supplierInvoiceRepository.save(any(SupplierInvoice.class))).thenReturn(sampleInvoice);

            ResponseEntity<SupplierInvoiceUploadResponseDTO> response = invoiceController.uploadInvoice(file, authentication);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().invoice().invoiceNumber()).isEqualTo("FA-2026-089");
            verify(invoiceParserService).parseInvoice(file);
            verify(supplierInvoiceRepository).save(sampleInvoice);
        }

        @Test
        @DisplayName("Should return 200 OK with duplicate flag when file was previously imported")
        void shouldReturnDuplicateResponse() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "factur-x.xml", "application/xml", "<xml/>".getBytes()
            );

            when(invoiceParserService.parseInvoice(file)).thenReturn(sampleInvoice);
            when(supplierInvoiceRepository.findByFileChecksum("a1b2c3d4")).thenReturn(Optional.of(sampleInvoice));

            ResponseEntity<SupplierInvoiceUploadResponseDTO> response = invoiceController.uploadInvoice(file, authentication);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().duplicate()).isTrue();
            assertThat(response.getBody().invoice().id()).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("Query Invoices")
    class QueryTests {

        @Test
        @DisplayName("Should list invoices with status filter")
        void shouldListInvoicesWithStatusFilter() {
            when(supplierInvoiceRepository.findByStatusOrderByInvoiceDateDesc(
                    SupplierInvoiceStatus.PENDING_REVIEW
            )).thenReturn(List.of(sampleInvoice));

            ResponseEntity<List<SupplierInvoiceDTO>> response = invoiceController.getAllInvoices(
                    SupplierInvoiceStatus.PENDING_REVIEW, null
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).hasSize(1);
            assertThat(response.getBody().getFirst().invoiceNumber()).isEqualTo("FA-2026-089");
        }

        @Test
        @DisplayName("Should get invoice by ID")
        void shouldGetInvoiceById() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(sampleInvoice));

            ResponseEntity<SupplierInvoiceDTO> response = invoiceController.getInvoiceById(1L);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().id()).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("Reconciliation Workflow")
    class ReconciliationTests {

        @Test
        @DisplayName("Should get reconciliation preview")
        void shouldGetReconciliationPreview() {
            SupplierInvoiceReconciliationDTO previewDto = new SupplierInvoiceReconciliationDTO(
                    1L,
                    "FA-2026-089",
                    10L,
                    "METRO France",
                    100L,
                    "PO-2026-001",
                    PurchaseOrderStatus.ORDERED,
                    new BigDecimal("214.50"),
                    new BigDecimal("214.50"),
                    BigDecimal.ZERO,
                    SupplierInvoiceStatus.PENDING_REVIEW,
                    List.of(),
                    List.of(),
                    true,
                    List.of()
            );

            when(reconciliationService.getReconciliationPreview(1L, 100L)).thenReturn(previewDto);

            ResponseEntity<SupplierInvoiceReconciliationDTO> response = invoiceController.getReconciliationPreview(1L, 100L);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().selectedPurchaseOrderId()).isEqualTo(100L);
            verify(reconciliationService).getReconciliationPreview(1L, 100L);
        }

        @Test
        @DisplayName("Should save reconciliation draft")
        void shouldSaveReconciliationDraft() {
            SupplierInvoiceReconcileRequest request = new SupplierInvoiceReconcileRequest(
                    100L, "Draft notes", List.of()
            );
            when(reconciliationService.reconcileInvoice(eq(1L), any(), any())).thenReturn(sampleInvoiceDto);

            ResponseEntity<SupplierInvoiceDTO> response = invoiceController.reconcileInvoice(1L, request, authentication);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            verify(reconciliationService).reconcileInvoice(eq(1L), eq(request), any());
        }

        @Test
        @DisplayName("Should apply reconciliation and intake stock")
        void shouldApplyReconciliation() {
            when(reconciliationService.applyInvoice(eq(1L), any())).thenReturn(sampleInvoiceDto);

            ResponseEntity<SupplierInvoiceDTO> response = invoiceController.applyInvoice(1L, authentication);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            verify(reconciliationService).applyInvoice(eq(1L), any());
        }
    }

    @Nested
    @DisplayName("Factur-X XML Download and Compliance")
    class DownloadAndComplianceTests {

        @Test
        @DisplayName("Should download raw Factur-X XML when present")
        void shouldDownloadRawFacturXXmlWhenPresent() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(sampleInvoice));

            ResponseEntity<String> response = invoiceController.downloadXml(1L);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_XML);
            assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("factur-x-FA-2026-089.xml");
            assertThat(response.getBody()).isEqualTo("<rsm:CrossIndustryInvoice/>");
        }

        @Test
        @DisplayName("Should get compliance report")
        void shouldGetComplianceReport() {
            SupplierInvoiceComplianceReportDTO report = new SupplierInvoiceComplianceReportDTO(
                    SupplierInvoiceComplianceStatus.COMPLIANT, true, true, true, true, List.of(), List.of()
            );
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(sampleInvoice));
            when(invoiceParserService.auditFrenchCompliance(sampleInvoice)).thenReturn(report);

            ResponseEntity<SupplierInvoiceComplianceReportDTO> response = invoiceController.getComplianceReport(1L);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().status()).isEqualTo(SupplierInvoiceComplianceStatus.COMPLIANT);
        }

        @Test
        @DisplayName("Should delete invoice returning 204 No Content")
        void shouldDeleteInvoice() {
            when(supplierInvoiceRepository.findById(1L)).thenReturn(Optional.of(sampleInvoice));

            ResponseEntity<Void> response = invoiceController.deleteInvoice(1L);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
            verify(supplierInvoiceRepository).delete(sampleInvoice);
        }
    }
}
