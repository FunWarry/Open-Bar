package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SupplierInvoiceComplianceReportDTO;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.SupplierRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentNameDictionary;
import org.apache.pdfbox.pdmodel.PDEmbeddedFilesNameTreeNode;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.filespecification.PDComplexFileSpecification;
import org.apache.pdfbox.pdmodel.common.filespecification.PDEmbeddedFile;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import com.bar.gestioncocktail.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.Month;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SupplierInvoiceParserService} verifying Factur-X XML parsing,
 * PDF heuristic text parsing, SHA-256 duplicate calculation, and French legal compliance auditing.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierInvoiceParserService Unit Tests")
class SupplierInvoiceParserServiceTest {

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @InjectMocks
    private SupplierInvoiceParserService parserService;

    private Supplier metroSupplier;
    private Ingredient ginIngredient;

    @BeforeEach
    void setUp() {
        metroSupplier = new Supplier();
        metroSupplier.setId(10L);
        metroSupplier.setNom("METRO France");
        metroSupplier.setSiren("399315613");
        metroSupplier.setSiret("39931561300010");
        metroSupplier.setVatNumber("FR12399315613");

        ginIngredient = new Ingredient();
        ginIngredient.setId(50L);
        ginIngredient.setNom("Gin Tanqueray London Dry");
        ginIngredient.setQuantiteStock(new BigDecimal("10.0"));
        ginIngredient.setPrixUnitaire(new BigDecimal("18.50"));
    }

    private static final String SAMPLE_FACTURX_XML = """
            <?xml version="1.0" encoding="UTF-8"?>
            <rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                                      xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                                      xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
                <rsm:ExchangedDocument>
                    <ram:ID>FA-2026-9901</ram:ID>
                    <ram:IssueDateTime>
                        <udt:DateTimeString format="102">20260315</udt:DateTimeString>
                    </ram:IssueDateTime>
                </rsm:ExchangedDocument>
                <rsm:SupplyChainTradeTransaction>
                    <ram:IncludedSupplyChainTradeLineItem>
                        <ram:AssociatedDocumentLineDocument>
                            <ram:LineID>1</ram:LineID>
                        </ram:AssociatedDocumentLineDocument>
                        <ram:SpecifiedTradeProduct>
                            <ram:SellerAssignedID>GIN-TANQ-70</ram:SellerAssignedID>
                            <ram:Name>Gin Tanqueray London Dry 70cl</ram:Name>
                        </ram:SpecifiedTradeProduct>
                        <ram:SpecifiedLineTradeAgreement>
                            <ram:NetPriceProductTradePrice>
                                <ram:ChargeAmount>18.90</ram:ChargeAmount>
                            </ram:NetPriceProductTradePrice>
                        </ram:SpecifiedLineTradeAgreement>
                        <ram:SpecifiedLineTradeDelivery>
                            <ram:BilledQuantity unitCode="BTL">6.0</ram:BilledQuantity>
                        </ram:SpecifiedLineTradeDelivery>
                        <ram:SpecifiedLineTradeSettlement>
                            <ram:SpecifiedTradeSettlementLineMonetarySummation>
                                <ram:LineTotalAmount>113.40</ram:LineTotalAmount>
                            </ram:SpecifiedTradeSettlementLineMonetarySummation>
                        </ram:SpecifiedLineTradeSettlement>
                    </ram:IncludedSupplyChainTradeLineItem>
                    <ram:ApplicableHeaderTradeAgreement>
                        <ram:SellerTradeParty>
                            <ram:Name>METRO France</ram:Name>
                            <ram:SpecifiedLegalOrganization>
                                <ram:ID>399315613</ram:ID>
                            </ram:SpecifiedLegalOrganization>
                            <ram:SpecifiedTaxRegistration>
                                <ram:ID schemeID="VA">FR12399315613</ram:ID>
                            </ram:SpecifiedTaxRegistration>
                        </ram:SellerTradeParty>
                    </ram:ApplicableHeaderTradeAgreement>
                    <ram:ApplicableHeaderTradeSettlement>
                        <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
                        <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                            <ram:LineTotalAmount>113.40</ram:LineTotalAmount>
                            <ram:TaxTotalAmount>22.68</ram:TaxTotalAmount>
                            <ram:GrandTotalAmount>136.08</ram:GrandTotalAmount>
                        </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                    </ram:ApplicableHeaderTradeSettlement>
                </rsm:SupplyChainTradeTransaction>
            </rsm:CrossIndustryInvoice>
            """;

    private static final String SAMPLE_UBL_XML = """
            <?xml version="1.0" encoding="UTF-8"?>
            <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
                     xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                     xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
                <cbc:ID>UBL-2026-001</cbc:ID>
                <cbc:IssueDate>2026-03-12</cbc:IssueDate>
                <cbc:DueDate>2026-04-12</cbc:DueDate>
                <cac:AccountingSupplierParty>
                    <cac:Party>
                        <cac:PartyName>
                            <cbc:Name>France Boissons</cbc:Name>
                        </cac:PartyName>
                        <cac:PartyLegalEntity>
                            <cbc:CompanyID>399315613</cbc:CompanyID>
                        </cac:PartyLegalEntity>
                    </cac:Party>
                </cac:AccountingSupplierParty>
                <cac:LegalMonetaryTotal>
                    <cbc:LineExtensionAmount>80.00</cbc:LineExtensionAmount>
                    <cbc:TaxExclusiveAmount>80.00</cbc:TaxExclusiveAmount>
                    <cbc:TaxInclusiveAmount>96.00</cbc:TaxInclusiveAmount>
                </cac:LegalMonetaryTotal>
                <cac:InvoiceLine>
                    <cbc:ID>1</cbc:ID>
                    <cbc:InvoicedQuantity>4</cbc:InvoicedQuantity>
                    <cbc:LineExtensionAmount>80.00</cbc:LineExtensionAmount>
                    <cac:Item>
                        <cbc:Name>Rhum Havana Club 3 Ans 70cl</cbc:Name>
                    </cac:Item>
                    <cac:Price>
                        <cbc:PriceAmount>20.00</cbc:PriceAmount>
                    </cac:Price>
                </cac:InvoiceLine>
            </Invoice>
            """;

    @Nested
    @DisplayName("Factur-X XML Ingestion")
    class FacturXXmlIngestionTests {

        @Test
        @DisplayName("Should parse standard Factur-X XML directly")
        void shouldParseFacturXXmlDirectly() {
            byte[] xmlBytes = SAMPLE_FACTURX_XML.getBytes(StandardCharsets.UTF_8);
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "factur-x.xml",
                    "application/xml",
                    xmlBytes
            );

            when(supplierRepository.findBySiren("399315613")).thenReturn(Optional.of(metroSupplier));
            when(ingredientRepository.findAll()).thenReturn(List.of(ginIngredient));

            SupplierInvoice invoice = parserService.parseInvoice(file);

            assertThat(invoice).isNotNull();
            assertAll("Parsed Factur-X XML fields",
                    () -> assertThat(invoice.getFormat()).isEqualTo(SupplierInvoiceFormat.XML_DIRECT),
                    () -> assertThat(invoice.getInvoiceNumber()).isEqualTo("FA-2026-9901"),
                    () -> assertThat(invoice.getSupplier()).isEqualTo(metroSupplier),
                    () -> assertThat(invoice.getTotalHt()).isEqualByComparingTo(new BigDecimal("113.40")),
                    () -> assertThat(invoice.getTotalTtc()).isEqualByComparingTo(new BigDecimal("136.08")),
                    () -> assertThat(invoice.getItems()).hasSize(1),
                    () -> assertThat(invoice.getItems().getFirst().getDesignation()).contains("Gin Tanqueray"),
                    () -> assertThat(invoice.getItems().getFirst().getMatchedIngredient()).isEqualTo(ginIngredient)
            );

            verify(establishmentConfigService).checkModuleEnabled(EstablishmentModule.FACTUR_X_INVOICE_IMPORT);
        }

        @Test
        @DisplayName("Should compute reproducible SHA-256 checksum for byte payload")
        void shouldComputeReproducibleSha256() {
            byte[] data = "OpenBar-FacturX-Test-Payload".getBytes(StandardCharsets.UTF_8);
            String hash1 = parserService.computeSha256(data);
            String hash2 = parserService.computeSha256(data);

            assertAll("Reproducible SHA-256 hashes",
                    () -> assertThat(hash1).isNotNull(),
                    () -> assertThat(hash1).isEqualTo(hash2),
                    () -> assertThat(hash1).hasSize(64)
            );
        }

        @Test
        @DisplayName("Should parse standard UBL electronic invoice XML")
        void shouldParseUblXmlDirectly() {
            byte[] xmlBytes = SAMPLE_UBL_XML.getBytes(StandardCharsets.UTF_8);
            MockMultipartFile file = new MockMultipartFile("file", "ubl-invoice.xml", "application/xml", xmlBytes);
            when(supplierRepository.findBySiren("399315613")).thenReturn(Optional.of(metroSupplier));

            SupplierInvoice invoice = parserService.parseInvoice(file);

            assertThat(invoice).isNotNull();
            assertThat(invoice.getInvoiceNumber()).isEqualTo("UBL-2026-001");
            assertThat(invoice.getItems()).hasSize(1);
            assertThat(invoice.getItems().getFirst().getDesignation()).isEqualTo("Rhum Havana Club 3 Ans 70cl");
        }

        @Test
        @DisplayName("Should throw BusinessException when uploaded file is empty or corrupted")
        void shouldThrowWhenFileCorrupted() {
            MockMultipartFile file = new MockMultipartFile("file", "corrupt.pdf", "application/pdf", new byte[]{0, 1, 2});
            assertThatThrownBy(() -> parserService.parseInvoice(file))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("Should throw BusinessException when uploaded file is null")
        void shouldThrowWhenFileIsNull() {
            assertThatThrownBy(() -> parserService.parseInvoice(null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("cannot be empty");
        }

        @Test
        @DisplayName("Should throw BusinessException when file format is unsupported")
        void shouldThrowWhenFileUnsupported() {
            MockMultipartFile file = new MockMultipartFile("file", "inv.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));
            assertThatThrownBy(() -> parserService.parseInvoice(file))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Unsupported invoice file format");
        }

        @Test
        @DisplayName("Should parse embedded Factur-X XML from PDF")
        void shouldParseEmbeddedFacturXFromPdf() throws IOException {
            byte[] pdfBytes = createPdfWithEmbeddedFacturX(SAMPLE_FACTURX_XML);
            MockMultipartFile file = new MockMultipartFile("file", "invoice_facturx.pdf", "application/pdf", pdfBytes);
            when(supplierRepository.findBySiren("399315613")).thenReturn(Optional.of(metroSupplier));

            SupplierInvoice invoice = parserService.parseInvoice(file);

            assertThat(invoice.getFormat()).isEqualTo(SupplierInvoiceFormat.FACTUR_X);
            assertThat(invoice.getInvoiceNumber()).isEqualTo("FA-2026-9901");
            assertThat(invoice.getItems()).isNotEmpty();
        }

        @Test
        @DisplayName("Should parse generic XML when root element is not standard Factur-X")
        void shouldParseGenericXml() {
            String genericXml = """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <GenericInvoice>
                        <Header><ID>GEN-2026</ID></Header>
                    </GenericInvoice>
                    """;
            MockMultipartFile file = new MockMultipartFile("file", "generic.xml", "application/xml", genericXml.getBytes(StandardCharsets.UTF_8));

            SupplierInvoice invoice = parserService.parseInvoice(file);

            assertThat(invoice.getProfile()).isEqualTo("GENERIC_XML");
            assertThat(invoice.getInvoiceNumber()).startsWith("INV-");
        }
    }

    @Nested
    @DisplayName("PDF Heuristic Text Parsing")
    class PdfHeuristicParsingTests {

        @Test
        @DisplayName("Should parse standard PDF with text heuristics when no Factur-X XML is embedded")
        void shouldParsePdfWithTextHeuristics() throws IOException {
            byte[] pdfBytes = createPdfWithText("""
                    FRANCE BOISSONS SAS
                    SIREN : 399315613
                    FACTURE N° : FB-2026-4402
                    Date : 18/03/2026
                    
                    Article                    Qté    P.U. HT    Total HT
                    Sirop de Grenadine Monin   12     4.50       54.00
                    
                    Total HT : 54.00 €
                    TVA 20% : 10.80 €
                    Total TTC : 64.80 €
                    """);

            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "invoice_france_boissons.pdf",
                    "application/pdf",
                    pdfBytes
            );

            when(supplierRepository.findBySiren("399315613")).thenReturn(Optional.of(metroSupplier));
            when(ingredientRepository.findAll()).thenReturn(Collections.emptyList());

            SupplierInvoice invoice = parserService.parseInvoice(file);

            assertThat(invoice).isNotNull();
            assertAll("Parsed PDF heuristic fields",
                    () -> assertThat(invoice.getFormat()).isEqualTo(SupplierInvoiceFormat.STANDARD_PDF),
                    () -> assertThat(invoice.getInvoiceNumber()).isEqualTo("FB-2026-4402"),
                    () -> assertThat(invoice.getTotalHt()).isEqualByComparingTo(new BigDecimal("54.00")),
                    () -> assertThat(invoice.getTotalTtc()).isEqualByComparingTo(new BigDecimal("64.80")),
                    () -> assertThat(invoice.getItems()).isNotEmpty()
            );
        }

        @Test
        @DisplayName("Should detect distributor suppliers in heuristic PDF parsing")
        void shouldDetectDistributorSuppliersInPdf() throws IOException {
            List<String> suppliers = List.of(
                    "METRO France",
                    "TRANSGOURMET SAS",
                    "COMPTOIR DES BOISSONS C10",
                    "PROMOCASH Grossiste",
                    "SYSCO France Distribution"
            );
            for (String sName : suppliers) {
                byte[] pdfBytes = createPdfWithText("FACTURE\n" + sName + "\nN Facture: FC-123\nDate: 15/03/2026\nTotal HT: 10.00\nTotal TTC: 12.00");
                MockMultipartFile file = new MockMultipartFile("file", "inv.pdf", "application/pdf", pdfBytes);
                SupplierInvoice invoice = parserService.parseInvoice(file);
                assertThat(invoice.getSupplierNameRaw()).isNotBlank();
            }
        }

        @Test
        @DisplayName("Should extract packaging capacity and carton pattern correctly")
        void shouldExtractPackagingCapacity() throws IOException {
            byte[] pdfBytes = createPdfWithText("""
                    METRO Cash & Carry
                    N Facture: FC-999
                    Date: 15/03/2026
                    Article                              Qté    P.U. HT    Total HT
                    Colis 6 x 75cl Gin Normand           2      20.00      40.00
                    Total HT : 40.00 €
                    Total TTC : 48.00 €
                    """);
            MockMultipartFile file = new MockMultipartFile("file", "inv.pdf", "application/pdf", pdfBytes);
            SupplierInvoice invoice = parserService.parseInvoice(file);
            assertThat(invoice.getItems()).isNotEmpty();
            assertThat(invoice.getItems().getFirst().getSuggestedPackagingCapacity()).isEqualByComparingTo(new BigDecimal("6"));
        }

        @Test
        @DisplayName("Should recalculate totals when header totals are zero or absent")
        void shouldRecalculateTotalsWhenZero() throws IOException {
            byte[] pdfBytes = createPdfWithText("""
                    METRO Cash & Carry
                    N Facture: FC-888
                    Date: 15/03/2026
                    Article                    Qté    P.U. HT    Total HT
                    Sirop Menthe 1L            2      5.00       10.00
                    Jus Ananas 1L              3      3.00       9.00
                    """);
            MockMultipartFile file = new MockMultipartFile("file", "inv.pdf", "application/pdf", pdfBytes);
            SupplierInvoice invoice = parserService.parseInvoice(file);
            assertThat(invoice.getTotalHt()).isEqualByComparingTo(new BigDecimal("19.00"));
            assertThat(invoice.getTotalTtc()).isGreaterThan(BigDecimal.ZERO);
        }
    }

    @Nested
    @DisplayName("French Legal Compliance Audit")
    class LegalComplianceAuditTests {

        @Test
        @DisplayName("Should pass compliance for valid invoice with Luhn SIREN and correct math")
        void shouldPassComplianceForValidInvoice() {
            SupplierInvoice invoice = new SupplierInvoice();
            invoice.setInvoiceNumber("INV-001");
            invoice.setInvoiceDate(LocalDate.of(2026, Month.MARCH, 15));
            invoice.setDueDate(LocalDate.of(2026, Month.APRIL, 15));
            invoice.setSupplierNameRaw("Test Bar");
            invoice.setSupplierSiren("732829320"); // Valid Luhn
            invoice.setSupplierVatNumber("FR12732829320");
            invoice.setTotalHt(new BigDecimal("100.00"));
            invoice.setTotalVat(new BigDecimal("20.00"));
            invoice.setTotalTtc(new BigDecimal("120.00"));

            SupplierInvoiceItem item = new SupplierInvoiceItem();
            item.setLineNumber(1);
            item.setDesignation("Rhum Blanc");
            item.setQuantityInvoiced(new BigDecimal("2"));
            item.setUnitPriceHt(new BigDecimal("50.00"));
            item.setLineTotalHt(new BigDecimal("100.00"));
            invoice.addItem(item);

            SupplierInvoiceComplianceReportDTO report = parserService.auditFrenchCompliance(invoice);

            assertAll("Compliant invoice audit",
                    () -> assertThat(report.status()).isEqualTo(SupplierInvoiceComplianceStatus.COMPLIANT),
                    () -> assertThat(report.hasMandatoryLegalMentions()).isTrue(),
                    () -> assertThat(report.hasValidSiren()).isTrue(),
                    () -> assertThat(report.isMathConsistent()).isTrue(),
                    () -> assertThat(report.complianceIssues()).isEmpty()
            );
        }

        @Test
        @DisplayName("Should detect invalid SIREN checksum and arithmetic mismatch")
        void shouldDetectInvalidSirenAndArithmeticMismatch() {
            SupplierInvoice invoice = new SupplierInvoice();
            invoice.setInvoiceNumber("INV-002");
            invoice.setSupplierNameRaw("Test Bad");
            invoice.setSupplierSiren("123456789"); // Invalid Luhn
            invoice.setTotalHt(new BigDecimal("100.00"));
            invoice.setTotalVat(new BigDecimal("20.00"));
            invoice.setTotalTtc(new BigDecimal("150.00")); // Mismatch! 100 + 20 != 150

            SupplierInvoiceComplianceReportDTO report = parserService.auditFrenchCompliance(invoice);

            assertAll("Non-compliant invoice audit",
                    () -> assertThat(report.status()).isEqualTo(SupplierInvoiceComplianceStatus.NON_COMPLIANT),
                    () -> assertThat(report.hasValidSiren()).isFalse(),
                    () -> assertThat(report.isMathConsistent()).isFalse(),
                    () -> assertThat(report.complianceIssues()).isNotEmpty(),
                    () -> assertThat(report.complianceIssues().stream().anyMatch(i -> i.contains("SIREN"))).isTrue(),
                    () -> assertThat(report.complianceIssues().stream().anyMatch(i -> i.contains("mismatch") || i.contains("Total"))).isTrue()
            );
        }

        @Test
        @DisplayName("Should audit invoice with WARNINGS when VAT number is missing")
        void shouldAuditInvoiceWithWarnings() {
            SupplierInvoice invoice = new SupplierInvoice();
            invoice.setInvoiceNumber("INV-WARN-01");
            invoice.setInvoiceDate(LocalDate.of(2026, Month.MARCH, 20));
            invoice.setDueDate(LocalDate.of(2026, Month.APRIL, 20));
            invoice.setSupplierNameRaw("Test Warnings");
            invoice.setSupplierSiren("732829320"); // Valid Luhn
            invoice.setSupplierVatNumber(null); // Missing VAT -> warning
            invoice.setTotalHt(new BigDecimal("100.00"));
            invoice.setTotalVat(new BigDecimal("20.00"));
            invoice.setTotalTtc(new BigDecimal("120.00"));

            SupplierInvoiceComplianceReportDTO report = parserService.auditFrenchCompliance(invoice);

            assertThat(report.status()).isEqualTo(SupplierInvoiceComplianceStatus.WARNINGS);
            assertThat(report.complianceWarnings()).anyMatch(issue -> issue.contains("TVA") || issue.contains("VAT"));
            assertThat(report.complianceIssues()).isEmpty();
        }

        @Test
        @DisplayName("Should detect line total arithmetic mismatch against header total HT")
        void shouldDetectLineTotalMismatch() {
            SupplierInvoice invoice = new SupplierInvoice();
            invoice.setInvoiceNumber("INV-003");
            invoice.setSupplierNameRaw("Test Bar");
            invoice.setSupplierSiren("732829320");
            invoice.setTotalHt(new BigDecimal("100.00"));
            invoice.setTotalVat(new BigDecimal("20.00"));
            invoice.setTotalTtc(new BigDecimal("120.00"));

            SupplierInvoiceItem item = new SupplierInvoiceItem();
            item.setLineNumber(1);
            item.setDesignation("Rhum");
            item.setLineTotalHt(new BigDecimal("50.00")); // Mismatch: 50 != 100
            invoice.addItem(item);

            SupplierInvoiceComplianceReportDTO report = parserService.auditFrenchCompliance(invoice);

            assertThat(report.isMathConsistent()).isFalse();
            assertThat(report.complianceIssues()).anyMatch(i -> i.contains("Line total mismatch"));
        }

        @Test
        @DisplayName("Should detect missing mandatory legal mentions like invoice number or supplier name")
        void shouldDetectMissingLegalMentions() {
            SupplierInvoice invoice = new SupplierInvoice();
            invoice.setInvoiceNumber(null);
            invoice.setSupplierNameRaw("   ");
            invoice.setSupplierSiren(null);

            SupplierInvoiceComplianceReportDTO report = parserService.auditFrenchCompliance(invoice);

            assertThat(report.hasMandatoryLegalMentions()).isFalse();
            assertThat(report.hasValidSiren()).isFalse();
            assertThat(report.complianceIssues()).anyMatch(i -> i.contains("invoice reference number"));
            assertThat(report.complianceIssues()).anyMatch(i -> i.contains("Missing seller identification"));
            assertThat(report.complianceIssues()).anyMatch(i -> i.contains("Missing seller SIREN"));
        }

        @Test
        @DisplayName("Should detect invalid SIREN with non-numeric chars or bad length")
        void shouldDetectBadSirenLengthAndNonDigits() {
            SupplierInvoice inv1 = new SupplierInvoice();
            inv1.setInvoiceNumber("INV-1");
            inv1.setSupplierNameRaw("Test");
            inv1.setSupplierSiren("123");

            SupplierInvoiceComplianceReportDTO rep1 = parserService.auditFrenchCompliance(inv1);
            assertThat(rep1.hasValidSiren()).isFalse();

            SupplierInvoice inv2 = new SupplierInvoice();
            inv2.setInvoiceNumber("INV-2");
            inv2.setSupplierNameRaw("Test");
            inv2.setSupplierSiren("73282932A");

            SupplierInvoiceComplianceReportDTO rep2 = parserService.auditFrenchCompliance(inv2);
            assertThat(rep2.hasValidSiren()).isFalse();
        }
    }

    private byte[] createPdfWithEmbeddedFacturX(String xmlContent) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("Invoice with embedded Factur-X XML");
                stream.endText();
            }

            PDEmbeddedFilesNameTreeNode efTree = new PDEmbeddedFilesNameTreeNode();
            PDComplexFileSpecification fs = new PDComplexFileSpecification();
            fs.setFile("factur-x.xml");
            PDEmbeddedFile ef = new PDEmbeddedFile(doc, new ByteArrayInputStream(xmlContent.getBytes(StandardCharsets.UTF_8)));
            fs.setEmbeddedFile(ef);
            Map<String, PDComplexFileSpecification> map = new HashMap<>();
            map.put("factur-x.xml", fs);
            efTree.setNames(map);

            PDDocumentNameDictionary names = new PDDocumentNameDictionary(doc.getDocumentCatalog());
            names.setEmbeddedFiles(efTree);
            doc.getDocumentCatalog().setNames(names);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    private byte[] createPdfWithText(String text) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                for (String line : text.split("\n")) {
                    stream.showText(line.trim());
                    stream.newLineAtOffset(0, -15);
                }
                stream.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }
}
