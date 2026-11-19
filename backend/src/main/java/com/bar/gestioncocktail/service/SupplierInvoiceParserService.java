package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SupplierInvoiceComplianceReportDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.SupplierRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentNameDictionary;
import org.apache.pdfbox.pdmodel.common.filespecification.PDComplexFileSpecification;
import org.apache.pdfbox.pdmodel.common.filespecification.PDEmbeddedFile;
import org.apache.pdfbox.pdmodel.PDEmbeddedFilesNameTreeNode;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service providing electronic and hybrid supplier invoice parsing (Factur-X / ZUGFeRD XML and PDF),
 * French commercial and tax compliance auditing, and ingredient catalog association.
 */
@Service
public class SupplierInvoiceParserService {

    private static final Logger log = LoggerFactory.getLogger(SupplierInvoiceParserService.class);
    private static final String DATE_TIME_STRING = "DateTimeString";
    private static final String KEYWORD_TOTAL = "TOTAL";
    private static final String KEYWORD_TVA = "TVA";
    private static final String KEYWORD_MONTANT = "MONTANT";

    private static final Pattern SIREN_PATTERN = Pattern.compile("(?iu)(?:siren|siret)[\\s.:]*(\\d{9})(?:\\d{5})?");
    private static final Pattern VAT_PATTERN = Pattern.compile("(?iu)(?:tva|vat)[\\s.:]*(FR[0-9A-Z]{2}\\d{9})");
    private static final Pattern INVOICE_NUM_PATTERN = Pattern.compile("(?iu)(?:facture|invoice)[\\s:#n°o]+([\\dA-Z_/-]{3,35})");
    private static final Pattern DATE_PATTERN = Pattern.compile("(?iu)(?:date|le|du)[\\s.:]+(\\d{2}[/.-]\\d{2}[/.-]\\d{4})");
    private static final Pattern CARTON_PATTERN = Pattern.compile("\\b(?:colis|pack|carton|caisse|x)\\s*(\\d+)");

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.BASIC_ISO_DATE,
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyyMMdd")
    );

    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final EstablishmentConfigService establishmentConfigService;

    /**
     * Constructs the SupplierInvoiceParserService with necessary repositories and configuration.
     *
     * @param supplierRepository        repository for supplier identification
     * @param ingredientRepository      repository for catalog ingredient matching
     * @param establishmentConfigService service for checking modular capability flags
     */
    public SupplierInvoiceParserService(
            SupplierRepository supplierRepository,
            IngredientRepository ingredientRepository,
            EstablishmentConfigService establishmentConfigService
    ) {
        this.supplierRepository = supplierRepository;
        this.ingredientRepository = ingredientRepository;
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Parses an uploaded multipart supplier invoice file (PDF with Factur-X XML, standard PDF, or XML).
     *
     * @param file uploaded multipart file
     * @return transient parsed {@link SupplierInvoice} entity ready for persistence or reconciliation
     */
    @Transactional(readOnly = true)
    public SupplierInvoice parseInvoice(MultipartFile file) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.FACTUR_X_INVOICE_IMPORT);

        if (file == null || file.isEmpty()) {
            throw new BusinessException("Uploaded invoice file cannot be empty");
        }

        try {
            byte[] bytes = file.getBytes();
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "invoice.pdf";
            String checksum = computeSha256(bytes);

            SupplierInvoice invoice;
            String lowerName = originalFilename.toLowerCase(Locale.ROOT);

            if (lowerName.endsWith(".xml")) {
                invoice = parseXmlInvoice(bytes, originalFilename);
                invoice.setFormat(SupplierInvoiceFormat.XML_DIRECT);
            } else if (lowerName.endsWith(".pdf")) {
                invoice = parsePdfInvoice(bytes, originalFilename);
            } else {
                throw new BusinessException("Unsupported invoice file format: only PDF and Factur-X XML files are supported");
            }

            invoice.setFileName(originalFilename);
            invoice.setFileChecksum(checksum);

            matchSupplier(invoice);
            matchIngredients(invoice);
            auditFrenchCompliance(invoice);

            return invoice;
        } catch (IOException e) {
            log.error("Failed to read uploaded invoice file", e);
            throw new BusinessException("Unable to read invoice file: " + e.getMessage());
        }
    }

    /**
     * Computes SHA-256 hash of byte array for duplicate invoice detection.
     *
     * @param data file content bytes
     * @return 64-character lowercase hex string
     */
    public String computeSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new BusinessException("SHA-256 algorithm unavailable: " + e.getMessage());
        }
    }

    private static String sanitizeLog(String input) {
        if (input == null) {
            return "unknown";
        }
        return input.replace('\n', '_').replace('\r', '_');
    }

    private SupplierInvoice parsePdfInvoice(byte[] pdfBytes, String filename) {
        String safeFilename = sanitizeLog(filename);
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            byte[] embeddedXmlBytes = extractEmbeddedFacturXXml(document);
            if (embeddedXmlBytes != null && embeddedXmlBytes.length > 0) {
                log.info("Embedded Factur-X XML detected in PDF: {}", safeFilename);
                SupplierInvoice invoice = parseXmlInvoice(embeddedXmlBytes, filename);
                invoice.setFormat(SupplierInvoiceFormat.FACTUR_X);
                invoice.setRawXmlContent(new String(embeddedXmlBytes, StandardCharsets.UTF_8));
                return invoice;
            }

            log.info("No embedded Factur-X XML found. Parsing PDF using heuristic text extraction: {}", safeFilename);
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            SupplierInvoice invoice = parsePdfTextHeuristically(text, filename);
            invoice.setFormat(SupplierInvoiceFormat.STANDARD_PDF);
            return invoice;
        } catch (IOException e) {
            log.error("Failed to parse PDF invoice: {}", safeFilename, e);
            throw new BusinessException("Failed to parse PDF document: " + e.getMessage());
        }
    }

    private byte[] extractEmbeddedFacturXXml(PDDocument document) {
        if (document.getDocumentCatalog() == null || document.getDocumentCatalog().getNames() == null) {
            return new byte[0];
        }

        PDDocumentNameDictionary names = document.getDocumentCatalog().getNames();
        PDEmbeddedFilesNameTreeNode efTree = names.getEmbeddedFiles();
        if (efTree == null) {
            return new byte[0];
        }

        try {
            Map<String, PDComplexFileSpecification> embeddedFiles = efTree.getNames();
            if (embeddedFiles != null) {
                for (Map.Entry<String, PDComplexFileSpecification> entry : embeddedFiles.entrySet()) {
                    String name = entry.getKey();
                    PDComplexFileSpecification fileSpec = entry.getValue();
                    if (isFacturXFileName(name)) {
                        PDEmbeddedFile embeddedFile = fileSpec.getEmbeddedFile();
                        if (embeddedFile != null) {
                            return embeddedFile.toByteArray();
                        }
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Error reading embedded files from PDF catalog", e);
        }
        return new byte[0];
    }

    private boolean isFacturXFileName(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase(Locale.ROOT);
        return lower.contains("factur-x") || lower.contains("zugferd") || lower.endsWith(".xml");
    }

    /**
     * Parses standard Factur-X / CII / UBL XML structured invoice.
     *
     * @param xmlBytes raw XML content
     * @param filename source file name
     * @return populated {@link SupplierInvoice}
     */
    public SupplierInvoice parseXmlInvoice(byte[] xmlBytes, String filename) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);

            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(xmlBytes));
            doc.getDocumentElement().normalize();

            String rootName = doc.getDocumentElement().getLocalName();
            if ("CrossIndustryInvoice".equalsIgnoreCase(rootName)) {
                return parseCiiInvoice(doc);
            } else if ("Invoice".equalsIgnoreCase(rootName)) {
                return parseUblInvoice(doc);
            } else {
                return parseGenericXmlInvoice();
            }
        } catch (Exception e) {
            log.error("Failed to parse XML invoice: {}", sanitizeLog(filename), e);
            throw new BusinessException("Invalid electronic invoice XML content: " + e.getMessage());
        }
    }

    private SupplierInvoice parseCiiInvoice(Document doc) {
        SupplierInvoice invoice = new SupplierInvoice();
        extractCiiHeader(doc, invoice);
        extractCiiParties(doc, invoice);
        extractCiiSettlement(doc, invoice);
        extractCiiLineItems(doc, invoice);
        recalculateTotalsIfZero(invoice);
        return invoice;
    }

    private void extractCiiHeader(Document doc, SupplierInvoice invoice) {
        String profile = getTextContentSafe(doc, "GuidelineSpecifiedDocumentContextParameter", "ID");
        invoice.setProfile(profile != null && !profile.isBlank() ? profile : "EN 16931");

        String invNum = getTextContentSafe(doc, "ExchangedDocument", "ID");
        invoice.setInvoiceNumber(invNum != null && !invNum.isBlank() ? invNum : "INV-" + System.currentTimeMillis());

        String issueDateStr = getTextContentSafe(doc, "IssueDateTime", DATE_TIME_STRING);
        invoice.setInvoiceDate(parseDateRobust(issueDateStr));

        Element buyerOrderDoc = findFirstElement(doc, "BuyerOrderReferencedDocument");
        if (buyerOrderDoc != null) {
            invoice.setOrderReference(findFirstText(buyerOrderDoc, "IssuerAssignedID"));
        }

        Element despatchDoc = findFirstElement(doc, "DespatchAdviceReferencedDocument");
        if (despatchDoc != null) {
            invoice.setDeliveryNoteReference(findFirstText(despatchDoc, "IssuerAssignedID"));
        }

        Element deliveryEvent = findFirstElement(doc, "ActualDeliverySupplyChainEvent");
        if (deliveryEvent != null) {
            invoice.setDeliveryDate(parseDateRobust(findFirstText(deliveryEvent, DATE_TIME_STRING)));
        }
    }

    private void extractCiiParties(Document doc, SupplierInvoice invoice) {
        Element sellerOrg = findFirstElement(doc, "SellerTradeParty");
        if (sellerOrg != null) {
            invoice.setSupplierNameRaw(findFirstText(sellerOrg, "Name"));
            Element legalOrg = findFirstElement(sellerOrg, "SpecifiedLegalOrganization");
            if (legalOrg != null) {
                invoice.setSupplierSiren(findFirstText(legalOrg, "ID"));
            }
            Element taxReg = findFirstElement(sellerOrg, "SpecifiedTaxRegistration");
            if (taxReg != null) {
                invoice.setSupplierVatNumber(findFirstText(taxReg, "ID"));
            }
        }

        Element buyerOrg = findFirstElement(doc, "BuyerTradeParty");
        if (buyerOrg != null) {
            invoice.setCustomerName(findFirstText(buyerOrg, "Name"));
            Element legalOrg = findFirstElement(buyerOrg, "SpecifiedLegalOrganization");
            if (legalOrg != null) {
                invoice.setCustomerSiren(findFirstText(legalOrg, "ID"));
            }
        }
    }

    private void extractCiiSettlement(Document doc, SupplierInvoice invoice) {
        Element settlement = findFirstElement(doc, "ApplicableHeaderTradeSettlement");
        if (settlement == null) {
            return;
        }

        invoice.setCurrency(Objects.requireNonNullElse(findFirstText(settlement, "InvoiceCurrencyCode"), "EUR"));
        Element dueDateElement = findFirstElement(settlement, "DueDateDateTime");
        if (dueDateElement != null) {
            invoice.setDueDate(parseDateRobust(findFirstText(dueDateElement, DATE_TIME_STRING)));
        }

        Element summation = findFirstElement(settlement, "SpecifiedTradeSettlementHeaderMonetarySummation");
        if (summation != null) {
            invoice.setTotalHt(parseDecimal(findFirstText(summation, "TaxBasisTotalAmount")));
            invoice.setTotalVat(parseDecimal(findFirstText(summation, "TaxTotalAmount")));
            BigDecimal grandTotal = parseDecimal(findFirstText(summation, "GrandTotalAmount"));
            if (grandTotal.compareTo(BigDecimal.ZERO) == 0) {
                grandTotal = parseDecimal(findFirstText(summation, "DuePayableAmount"));
            }
            invoice.setTotalTtc(grandTotal);
        }
    }

    private void extractCiiLineItems(Document doc, SupplierInvoice invoice) {
        if (doc == null) {
            return;
        }
        NodeList lineNodes = doc.getElementsByTagNameNS("*", "IncludedSupplyChainTradeLineItem");
        if (lineNodes.getLength() == 0) {
            lineNodes = doc.getElementsByTagName("ram:IncludedSupplyChainTradeLineItem");
        }

        for (int i = 0; i < lineNodes.getLength(); i++) {
            Node node = lineNodes.item(i);
            if (node instanceof Element lineElem) {
                invoice.addItem(buildCiiItem(lineElem, i + 1));
            }
        }
    }

    private SupplierInvoiceItem buildCiiItem(Element lineElem, int lineNumber) {
        SupplierInvoiceItem item = new SupplierInvoiceItem();
        item.setLineNumber(lineNumber);

        populateCiiProduct(lineElem, item);
        populateCiiDelivery(lineElem, item);
        populateCiiItemFinancials(lineElem, item);
        finalizeCiiTotals(item);

        return item;
    }

    private void populateCiiProduct(Element lineElem, SupplierInvoiceItem item) {
        Element product = findFirstElement(lineElem, "SpecifiedTradeProduct");
        if (product != null) {
            item.setDesignation(findFirstText(product, "Name"));
            String ref = findFirstText(product, "SellerAssignedID");
            item.setProductReference(ref != null ? ref : findFirstText(product, "GlobalID"));
        }
    }

    private void populateCiiDelivery(Element lineElem, SupplierInvoiceItem item) {
        Element delivery = findFirstElement(lineElem, "SpecifiedLineTradeDelivery");
        if (delivery != null) {
            Element billedQty = findFirstElement(delivery, "BilledQuantity");
            if (billedQty != null) {
                item.setQuantityInvoiced(parseDecimal(billedQty.getTextContent()));
                item.setPackaging(billedQty.getAttribute("unitCode"));
            }
        }
    }

    private void finalizeCiiTotals(SupplierInvoiceItem item) {
        if (item.getLineTotalHt() != null && item.getQuantityInvoiced() != null && item.getUnitPriceHt() != null
                && item.getLineTotalHt().compareTo(BigDecimal.ZERO) == 0 && item.getQuantityInvoiced().compareTo(BigDecimal.ZERO) > 0) {
            item.setLineTotalHt(item.getQuantityInvoiced().multiply(item.getUnitPriceHt()).setScale(2, RoundingMode.HALF_UP));
        }

        BigDecimal vatRate = item.getVatRate() != null ? item.getVatRate() : BigDecimal.ZERO;
        BigDecimal vatRatio = vatRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal totalHt = item.getLineTotalHt() != null ? item.getLineTotalHt() : BigDecimal.ZERO;
        BigDecimal vatAmt = totalHt.multiply(vatRatio).setScale(2, RoundingMode.HALF_UP);
        item.setLineTotalTtc(totalHt.add(vatAmt).setScale(2, RoundingMode.HALF_UP));
        item.setSuggestedPackagingCapacity(resolvePackagingCapacity(item.getPackaging(), item.getDesignation()));
    }

    private void populateCiiItemFinancials(Element lineElem, SupplierInvoiceItem item) {
        Element agreement = findFirstElement(lineElem, "SpecifiedLineTradeAgreement");
        if (agreement != null) {
            Element netPrice = findFirstElement(agreement, "NetPriceProductTradePrice");
            if (netPrice != null) {
                item.setUnitPriceHt(parseDecimal(findFirstText(netPrice, "ChargeAmount")));
            }
        }

        Element settlement = findFirstElement(lineElem, "SpecifiedLineTradeSettlement");
        if (settlement != null) {
            Element tax = findFirstElement(settlement, "ApplicableTradeTax");
            if (tax != null) {
                item.setVatRate(parseDecimal(findFirstText(tax, "RateApplicablePercent")));
            }
            Element summation = findFirstElement(settlement, "SpecifiedTradeSettlementLineMonetarySummation");
            if (summation != null) {
                item.setLineTotalHt(parseDecimal(findFirstText(summation, "LineTotalAmount")));
            }
        }
    }

    private SupplierInvoice parseUblInvoice(Document doc) {
        SupplierInvoice invoice = new SupplierInvoice();
        invoice.setProfile("UBL-2.1");
        if (doc == null) {
            return invoice;
        }
        invoice.setInvoiceNumber(getTextContentSafe(doc, "ID"));
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isBlank()) {
            invoice.setInvoiceNumber("INV-" + System.currentTimeMillis());
        }

        invoice.setInvoiceDate(parseDateRobust(getTextContentSafe(doc, "IssueDate")));
        invoice.setDueDate(parseDateRobust(getTextContentSafe(doc, "DueDate")));

        Element supplierParty = findFirstElement(doc, "AccountingSupplierParty");
        if (supplierParty != null) {
            invoice.setSupplierNameRaw(findFirstText(supplierParty, "PartyName"));
            Element companyId = findFirstElement(supplierParty, "CompanyID");
            if (companyId != null && companyId.getTextContent() != null) {
                invoice.setSupplierSiren(companyId.getTextContent().trim());
            }
        }

        Element orderRef = findFirstElement(doc, "OrderReference");
        if (orderRef != null) {
            invoice.setOrderReference(findFirstText(orderRef, "ID"));
        }

        Element legalMonetary = findFirstElement(doc, "LegalMonetaryTotal");
        if (legalMonetary != null) {
            invoice.setTotalHt(parseDecimal(findFirstText(legalMonetary, "TaxExclusiveAmount")));
            invoice.setTotalTtc(parseDecimal(findFirstText(legalMonetary, "TaxInclusiveAmount")));
        }

        Element taxTotal = findFirstElement(doc, "TaxTotal");
        if (taxTotal != null) {
            invoice.setTotalVat(parseDecimal(findFirstText(taxTotal, "TaxAmount")));
        }

        NodeList lines = doc.getElementsByTagNameNS("*", "InvoiceLine");
        for (int i = 0; i < lines.getLength(); i++) {
            Node n = lines.item(i);
            if (n instanceof Element line) {
                invoice.addItem(buildUblItem(line, i + 1));
            }
        }

        recalculateTotalsIfZero(invoice);
        return invoice;
    }

    private SupplierInvoiceItem buildUblItem(Element line, int lineNumber) {
        SupplierInvoiceItem item = new SupplierInvoiceItem();
        item.setLineNumber(lineNumber);

        Element itemElem = findFirstElement(line, "Item");
        if (itemElem != null) {
            item.setDesignation(findFirstText(itemElem, "Name"));
            Element idElem = findFirstElement(itemElem, "SellersItemIdentification");
            if (idElem != null) {
                item.setProductReference(findFirstText(idElem, "ID"));
            }
        }

        item.setQuantityInvoiced(parseDecimal(findFirstText(line, "InvoicedQuantity")));
        Element price = findFirstElement(line, "Price");
        if (price != null) {
            item.setUnitPriceHt(parseDecimal(findFirstText(price, "PriceAmount")));
        }

        item.setLineTotalHt(parseDecimal(findFirstText(line, "LineExtensionAmount")));
        if (item.getLineTotalHt().compareTo(BigDecimal.ZERO) == 0 && item.getQuantityInvoiced().compareTo(BigDecimal.ZERO) > 0) {
            item.setLineTotalHt(item.getQuantityInvoiced().multiply(item.getUnitPriceHt()).setScale(2, RoundingMode.HALF_UP));
        }
        item.setLineTotalTtc(item.getLineTotalHt().multiply(new BigDecimal("1.20")).setScale(2, RoundingMode.HALF_UP));
        item.setSuggestedPackagingCapacity(resolvePackagingCapacity(item.getPackaging(), item.getDesignation()));
        return item;
    }

    private SupplierInvoice parseGenericXmlInvoice() {
        SupplierInvoice invoice = new SupplierInvoice();
        invoice.setProfile("GENERIC_XML");
        invoice.setInvoiceNumber("INV-" + System.currentTimeMillis());
        invoice.setInvoiceDate(LocalDate.now(ZoneId.systemDefault()));
        return invoice;
    }

    /**
     * Extracts supplier invoice data from text using heuristic regex matching (Metro, France Boissons, C10, etc.).
     *
     * @param text     extracted PDF text
     * @param filename source PDF filename
     * @return parsed invoice entity
     */
    public SupplierInvoice parsePdfTextHeuristically(String text, String filename) {
        SupplierInvoice invoice = new SupplierInvoice();
        invoice.setProfile("HEURISTIC_PDF");

        Matcher sirenMatcher = SIREN_PATTERN.matcher(text);
        if (sirenMatcher.find()) {
            invoice.setSupplierSiren(sirenMatcher.group(1));
        }

        Matcher vatMatcher = VAT_PATTERN.matcher(text);
        if (vatMatcher.find()) {
            invoice.setSupplierVatNumber(vatMatcher.group(1));
        }

        Matcher invNumMatcher = INVOICE_NUM_PATTERN.matcher(text);
        if (invNumMatcher.find()) {
            invoice.setInvoiceNumber(invNumMatcher.group(1).trim());
        } else {
            invoice.setInvoiceNumber("PDF-" + System.currentTimeMillis());
        }

        Matcher dateMatcher = DATE_PATTERN.matcher(text);
        if (dateMatcher.find()) {
            invoice.setInvoiceDate(parseDateRobust(dateMatcher.group(1)));
        } else {
            invoice.setInvoiceDate(LocalDate.now(ZoneId.systemDefault()));
        }

        extractTotalsFromText(text, invoice);

        detectDistributorSupplier(text, invoice);
        parseLineItemsFromText(text, invoice);
        recalculateTotalsIfZero(invoice);

        return invoice;
    }

    private void detectDistributorSupplier(String text, SupplierInvoice invoice) {
        String upper = text.toUpperCase();
        if (upper.contains("FRANCE BOISSONS")) {
            invoice.setSupplierNameRaw("France Boissons");
        } else if (upper.contains("METRO")) {
            invoice.setSupplierNameRaw("Metro Cash & Carry");
        } else if (upper.contains("TRANSGOURMET")) {
            invoice.setSupplierNameRaw("Transgourmet");
        } else if (upper.contains("C10") || upper.contains("COMPTOIR DES BOISSONS")) {
            invoice.setSupplierNameRaw("Réseau C10");
        } else if (upper.contains("PROMOCASH")) {
            invoice.setSupplierNameRaw("Promocash");
        } else if (upper.contains("SYSCO")) {
            invoice.setSupplierNameRaw("Sysco France");
        }
    }

    private void parseLineItemsFromText(String text, SupplierInvoice invoice) {
        String[] lines = text.split("\r?\n");
        int lineNo = 1;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || isHeaderOrTotalLine(trimmed)) {
                continue;
            }
            SupplierInvoiceItem item = parseTextLineItem(trimmed, lineNo);
            if (item != null) {
                invoice.addItem(item);
                lineNo++;
            }
        }
    }

    private boolean isHeaderOrTotalLine(String line) {
        String upper = line.toUpperCase(Locale.ROOT);
        return upper.contains(KEYWORD_TOTAL) || upper.contains(KEYWORD_TVA) || upper.contains("FACTURE")
                || upper.contains("ARTICLE") || upper.contains("DATE") || upper.contains("SIREN");
    }

    private SupplierInvoiceItem parseTextLineItem(String line, int lineNumber) {
        String[] tokens = line.split("\\s+");
        if (tokens.length < 3) {
            return null;
        }

        int len = tokens.length;
        BigDecimal lastNum = parseNumberLenient(tokens[len - 1]);
        BigDecimal secondLastNum = parseNumberLenient(tokens[len - 2]);

        if (lastNum == null || secondLastNum == null) {
            return null;
        }

        BigDecimal thirdLastNum = len >= 4 ? parseNumberLenient(tokens[len - 3]) : null;

        BigDecimal qty;
        BigDecimal unitPrice;
        BigDecimal totalHt;
        int descEnd;

        if (thirdLastNum != null) {
            qty = thirdLastNum;
            unitPrice = secondLastNum;
            totalHt = lastNum;
            descEnd = len - 3;
        } else {
            qty = secondLastNum;
            unitPrice = lastNum;
            totalHt = qty.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
            descEnd = len - 2;
        }

        StringBuilder desc = new StringBuilder();
        for (int i = 0; i < descEnd; i++) {
            if (i > 0) {
                desc.append(" ");
            }
            desc.append(tokens[i]);
        }
        String designation = desc.toString().trim();
        if (designation.isEmpty()) {
            return null;
        }

        SupplierInvoiceItem item = new SupplierInvoiceItem();
        item.setLineNumber(lineNumber);
        item.setDesignation(designation);
        item.setQuantityInvoiced(qty);
        item.setUnitPriceHt(unitPrice);
        item.setLineTotalHt(totalHt);
        item.setVatRate(new BigDecimal("20.00"));
        BigDecimal vatAmt = totalHt.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);
        item.setLineTotalTtc(totalHt.add(vatAmt).setScale(2, RoundingMode.HALF_UP));
        item.setPackaging("Unité");
        item.setSuggestedPackagingCapacity(resolvePackagingCapacity(item.getPackaging(), designation));
        return item;
    }

    private BigDecimal parseNumberLenient(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String clean = token.replace(',', '.').replace("€", "").trim();
        try {
            return new BigDecimal(clean);
        } catch (NumberFormatException _) {
            return null;
        }
    }

    private void extractTotalsFromText(String text, SupplierInvoice invoice) {
        String[] lines = text.split("\r?\n");
        for (String line : lines) {
            processTotalLine(line, invoice);
        }
    }

    private void processTotalLine(String line, SupplierInvoice invoice) {
        String upper = line.toUpperCase(Locale.ROOT);
        tryExtractTotalHt(line, upper, invoice);
        tryExtractTotalVat(line, upper, invoice);
        tryExtractTotalTtc(line, upper, invoice);
    }

    private void tryExtractTotalHt(String line, String upper, SupplierInvoice invoice) {
        if ((invoice.getTotalHt() == null || invoice.getTotalHt().compareTo(BigDecimal.ZERO) == 0) && isTotalHtLine(upper)) {
            BigDecimal val = extractAmountFromLine(line);
            if (val != null) {
                invoice.setTotalHt(val);
            }
        }
    }

    private void tryExtractTotalVat(String line, String upper, SupplierInvoice invoice) {
        if ((invoice.getTotalVat() == null || invoice.getTotalVat().compareTo(BigDecimal.ZERO) == 0) && isTotalVatLine(upper)) {
            BigDecimal val = extractAmountFromLine(line);
            if (val != null) {
                invoice.setTotalVat(val);
            }
        }
    }

    private void tryExtractTotalTtc(String line, String upper, SupplierInvoice invoice) {
        if ((invoice.getTotalTtc() == null || invoice.getTotalTtc().compareTo(BigDecimal.ZERO) == 0) && isTotalTtcLine(upper)) {
            BigDecimal val = extractAmountFromLine(line);
            if (val != null) {
                invoice.setTotalTtc(val);
            }
        }
    }

    private boolean isTotalHtLine(String upper) {
        return (upper.contains(KEYWORD_TOTAL) || upper.contains(KEYWORD_MONTANT) || upper.contains("NET"))
                && upper.contains("HT")
                && !upper.contains("TTC");
    }

    private boolean isTotalVatLine(String upper) {
        return (upper.contains(KEYWORD_TOTAL) || upper.contains(KEYWORD_MONTANT) || upper.contains("%") || upper.contains(":"))
                && (upper.contains(KEYWORD_TVA) || upper.contains("VAT"));
    }

    private boolean isTotalTtcLine(String upper) {
        return upper.contains("TOTAL TTC")
                || upper.contains("NET A PAYER")
                || upper.contains("NET À PAYER")
                || upper.contains(KEYWORD_MONTANT + " TTC");
    }

    private BigDecimal extractAmountFromLine(String line) {
        String[] tokens = line.trim().split("\\s+");
        for (int i = tokens.length - 1; i >= 0; i--) {
            BigDecimal parsed = parseNumberLenient(tokens[i]);
            if (parsed != null && parsed.compareTo(BigDecimal.ZERO) > 0) {
                return resolveCombinedAmount(tokens, i, parsed);
            }
        }
        return null;
    }

    private BigDecimal resolveCombinedAmount(String[] tokens, int index, BigDecimal fallback) {
        if (index > 0 && (tokens[index].contains(".") || tokens[index].contains(","))) {
            BigDecimal combined = parseNumberLenient(tokens[index - 1] + tokens[index]);
            if (combined != null) {
                return combined;
            }
        }
        return fallback;
    }

    private void recalculateTotalsIfZero(SupplierInvoice invoice) {
        if ((invoice.getTotalHt() == null || invoice.getTotalHt().compareTo(BigDecimal.ZERO) == 0) && !invoice.getItems().isEmpty()) {
            BigDecimal sumHt = BigDecimal.ZERO;
            BigDecimal sumVat = BigDecimal.ZERO;
            for (SupplierInvoiceItem it : invoice.getItems()) {
                BigDecimal lineHt = it.getLineTotalHt() != null ? it.getLineTotalHt() : BigDecimal.ZERO;
                BigDecimal lineVatRate = it.getVatRate() != null ? it.getVatRate() : BigDecimal.ZERO;
                sumHt = sumHt.add(lineHt);
                BigDecimal lineVat = lineHt.multiply(lineVatRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                sumVat = sumVat.add(lineVat);
            }
            invoice.setTotalHt(sumHt.setScale(2, RoundingMode.HALF_UP));
            invoice.setTotalVat(sumVat.setScale(2, RoundingMode.HALF_UP));
            invoice.setTotalTtc(sumHt.add(sumVat).setScale(2, RoundingMode.HALF_UP));
        }
    }

    private BigDecimal resolvePackagingCapacity(String packaging, String designation) {
        String combined = ((packaging != null ? packaging : "") + " " + (designation != null ? designation : ""))
                .toLowerCase(Locale.ROOT)
                .replace(" de ", " ");
        Matcher m = CARTON_PATTERN.matcher(combined);
        if (m.find()) {
            try {
                int count = Integer.parseInt(m.group(1));
                if (count > 0) {
                    return BigDecimal.valueOf(count);
                }
            } catch (NumberFormatException _) {
                // fall through to default
            }
        }
        return BigDecimal.ONE;
    }

    private void matchSupplier(SupplierInvoice invoice) {
        Supplier matched = null;
        if (invoice.getSupplierSiren() != null && !invoice.getSupplierSiren().isBlank()) {
            matched = supplierRepository.findBySiren(invoice.getSupplierSiren()).orElse(null);
        }
        if (matched == null && invoice.getSupplierVatNumber() != null && !invoice.getSupplierVatNumber().isBlank()) {
            matched = supplierRepository.findByVatNumber(invoice.getSupplierVatNumber()).orElse(null);
        }
        if (matched == null && invoice.getSupplierNameRaw() != null && !invoice.getSupplierNameRaw().isBlank()) {
            matched = matchSupplierByName(invoice.getSupplierNameRaw());
        }

        if (matched != null) {
            invoice.setSupplier(matched);
            if (matched.getSiren() != null && (invoice.getSupplierSiren() == null || invoice.getSupplierSiren().isBlank())) {
                invoice.setSupplierSiren(matched.getSiren());
            }
        }
    }

    private Supplier matchSupplierByName(String rawName) {
        Supplier found = supplierRepository.findByNomIgnoreCase(rawName.trim()).orElse(null);
        if (found != null) {
            return found;
        }
        String rawClean = rawName.toLowerCase(Locale.ROOT);
        for (Supplier s : supplierRepository.findAll()) {
            if (rawClean.contains(s.getNom().toLowerCase(Locale.ROOT)) || s.getNom().toLowerCase(Locale.ROOT).contains(rawClean)) {
                return s;
            }
        }
        return null;
    }

    private void matchIngredients(SupplierInvoice invoice) {
        List<Ingredient> catalog = ingredientRepository.findAll();
        for (SupplierInvoiceItem item : invoice.getItems()) {
            Ingredient found = findMatchingIngredient(item.getDesignation(), catalog);
            if (found != null) {
                item.setMatchedIngredient(found);
                item.setReconciliationStatus(InvoiceItemReconciliationStatus.MATCHED);
            } else {
                item.setReconciliationStatus(InvoiceItemReconciliationStatus.UNRECOGNIZED_INGREDIENT);
                item.setVarianceDetails("Product not recognized in catalog. Map or create a new ingredient.");
            }
        }
    }

    private Ingredient findMatchingIngredient(String designation, List<Ingredient> catalog) {
        if (designation == null || designation.isBlank()) return null;
        String descLower = designation.toLowerCase(Locale.ROOT).trim();

        for (Ingredient ing : catalog) {
            String ingLower = ing.getNom().toLowerCase(Locale.ROOT).trim();
            if (descLower.equals(ingLower) || descLower.startsWith(ingLower) || ingLower.startsWith(descLower)) {
                return ing;
            }
        }
        return null;
    }

    /**
     * Audits French legal commercial mentions and electronic invoicing compliance.
     *
     * @param invoice invoice to audit
     * @return compliance report DTO
     */
    public SupplierInvoiceComplianceReportDTO auditFrenchCompliance(SupplierInvoice invoice) {
        List<String> issues = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        validateMandatoryFields(invoice, issues, warnings);
        boolean hasValidSiren = validateSirenAndVat(invoice, issues, warnings);
        boolean isMathConsistent = validateMathTotals(invoice, issues);

        SupplierInvoiceComplianceStatus status;
        if (!issues.isEmpty()) {
            status = SupplierInvoiceComplianceStatus.NON_COMPLIANT;
        } else if (!warnings.isEmpty()) {
            status = SupplierInvoiceComplianceStatus.WARNINGS;
        } else {
            status = SupplierInvoiceComplianceStatus.COMPLIANT;
        }

        invoice.setLegalComplianceStatus(status);
        String details = "Issues: " + String.join(" | ", issues) + "; Warnings: " + String.join(" | ", warnings);
        invoice.setComplianceDetails(details);

        return new SupplierInvoiceComplianceReportDTO(
                status,
                issues.isEmpty(),
                hasValidSiren,
                true,
                isMathConsistent,
                issues,
                warnings
        );
    }

    private void validateMandatoryFields(SupplierInvoice invoice, List<String> issues, List<String> warnings) {
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isBlank()) {
            issues.add("Missing mandatory invoice reference number.");
        }
        if (invoice.getInvoiceDate() == null) {
            issues.add("Missing mandatory invoice date.");
        }
        if (invoice.getSupplierNameRaw() == null || invoice.getSupplierNameRaw().isBlank()) {
            issues.add("Missing seller identification (company name).");
        }
        if (invoice.getDueDate() == null) {
            warnings.add("Missing payment due date (mention 'Date d'échéance').");
        }
    }

    private boolean validateSirenAndVat(SupplierInvoice invoice, List<String> issues, List<String> warnings) {
        boolean hasValidSiren = true;
        if (invoice.getSupplierSiren() == null || invoice.getSupplierSiren().isBlank()) {
            issues.add("Missing seller SIREN number (mandatory for French B2B invoicing).");
            hasValidSiren = false;
        } else if (!checkLuhnSiren(invoice.getSupplierSiren())) {
            issues.add("Seller SIREN (" + invoice.getSupplierSiren() + ") fails Luhn checksum algorithm.");
            hasValidSiren = false;
        }

        if (invoice.getSupplierVatNumber() == null || invoice.getSupplierVatNumber().isBlank()) {
            warnings.add("Missing seller intra-community VAT number (N° TVA Intracommunautaire).");
        }
        return hasValidSiren;
    }

    private boolean validateMathTotals(SupplierInvoice invoice, List<String> issues) {
        BigDecimal ht = Objects.requireNonNullElse(invoice.getTotalHt(), BigDecimal.ZERO);
        BigDecimal vat = Objects.requireNonNullElse(invoice.getTotalVat(), BigDecimal.ZERO);
        BigDecimal ttc = Objects.requireNonNullElse(invoice.getTotalTtc(), BigDecimal.ZERO);

        BigDecimal expectedTtc = ht.add(vat).setScale(2, RoundingMode.HALF_UP);
        boolean isMathConsistent = true;
        if (ttc.compareTo(BigDecimal.ZERO) > 0 && expectedTtc.subtract(ttc).abs().compareTo(new BigDecimal("0.05")) > 0) {
            issues.add("Arithmetic mismatch: Total HT (" + ht + ") + Total VAT (" + vat + ") != Total TTC (" + ttc + "). Expected: " + expectedTtc);
            isMathConsistent = false;
        }

        BigDecimal linesHt = BigDecimal.ZERO;
        for (SupplierInvoiceItem it : invoice.getItems()) {
            if (it.getLineTotalHt() != null) {
                linesHt = linesHt.add(it.getLineTotalHt());
            }
        }
        linesHt = linesHt.setScale(2, RoundingMode.HALF_UP);

        if (ht.compareTo(BigDecimal.ZERO) > 0 && linesHt.compareTo(BigDecimal.ZERO) > 0 && linesHt.subtract(ht).abs().compareTo(new BigDecimal("0.10")) > 0) {
            issues.add("Line total mismatch: sum of line items HT (" + linesHt + ") differs from invoice Total HT (" + ht + ").");
            isMathConsistent = false;
        }
        return isMathConsistent;
    }

    private boolean checkLuhnSiren(String siren) {
        if (siren == null) return false;
        String clean = siren.replace(" ", "");
        if (clean.length() != 9) return false;

        int sum = 0;
        for (int i = 0; i < 9; i++) {
            char c = clean.charAt(i);
            if (!Character.isDigit(c)) return false;
            int digit = c - '0';
            if (i % 2 == 1) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return (sum % 10) == 0;
    }

    private LocalDate parseDateRobust(String raw) {
        ZoneId zone = ZoneId.systemDefault();
        if (raw == null || raw.isBlank()) {
            return LocalDate.now(zone);
        }
        String clean = raw.trim();
        for (DateTimeFormatter dtf : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(clean, dtf);
            } catch (DateTimeParseException _) {
                // try next format
            }
        }
        return LocalDate.now(zone);
    }

    private BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(raw.trim().replace(',', '.').replaceAll("[^\\d.-]", ""));
        } catch (NumberFormatException _) {
            return BigDecimal.ZERO;
        }
    }

    private String getTextContentSafe(Document doc, String... tags) {
        if (doc == null || tags == null || tags.length == 0) {
            return null;
        }
        Element el = null;
        for (String tag : tags) {
            el = (el == null) ? findFirstElement(doc, tag) : findFirstElement(el, tag);
            if (el == null) {
                return null;
            }
        }
        if (el == null) {
            return null;
        }
        String text = el.getTextContent();
        return text != null ? text.trim() : null;
    }

    private Element findFirstElement(Node root, String localName) {
        if (root == null) return null;
        if (root.getNodeType() == Node.ELEMENT_NODE) {
            Element el = (Element) root;
            if (localName.equalsIgnoreCase(el.getLocalName()) || localName.equalsIgnoreCase(el.getTagName())) {
                return el;
            }
        }
        NodeList children = root.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Element found = findFirstElement(children.item(i), localName);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private String findFirstText(Node root, String localName) {
        Element el = findFirstElement(root, localName);
        return el != null && el.getTextContent() != null ? el.getTextContent().trim() : null;
    }
}
