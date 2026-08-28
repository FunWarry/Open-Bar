package com.bar.gestioncocktail.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.CurrencyPosition;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.VatRate;
import org.springframework.stereotype.Service;

import com.lowagie.text.DocumentException;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service for generating legal A4 invoice PDF documents using OpenPDF with dynamic establishment currency formatting.
 */
@Service
public class PdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color PRIMARY = new Color(108, 127, 232);  // #6c7fe8
    private static final Color SURFACE = new Color(33, 38, 63);    // #21263f
    private static final Color TEXT    = new Color(236, 238, 251);  // #eceefb
    private static final Color MUTED   = new Color(126, 135, 168); // #7e87a8
    private static final Color DARK_TEXT = new Color(30, 30, 45);
    private static final String TOTAL_TTC_HEADER = "Total TTC";
    private static final String BASE_HT_HEADER = "Base HT";

    private final EstablishmentConfigService establishmentConfigService;
    private final AppSettingsService appSettingsService;

    /**
     * Constructs the PDF generation service.
     *
     * @param establishmentConfigService Legal configuration service
     * @param appSettingsService Application settings service for currency customization
     */
    public PdfService(EstablishmentConfigService establishmentConfigService, AppSettingsService appSettingsService) {
        this.establishmentConfigService = establishmentConfigService;
        this.appSettingsService = appSettingsService;
    }

    /**
     * Generates an A4 PDF invoice document for the given facture entity.
     *
     * @param facture the invoice entity
     * @return PDF content as byte array
     */
    public byte[] generateFacturePdf(Facture facture) {
        EstablishmentConfig config = null;
        if (establishmentConfigService != null) {
            config = establishmentConfigService.getConfig();
        }
        if (config == null) {
            config = new EstablishmentConfig();
        }

        AppSettings settings = null;
        if (appSettingsService != null) {
            settings = appSettingsService.getSettings();
        }
        if (settings == null) {
            settings = new AppSettings();
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPdfVersion(PdfWriter.PDF_VERSION_1_7);
            doc.open();

            Font titleFont  = new Font(Font.HELVETICA, 20, Font.BOLD, PRIMARY);
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, TEXT);
            Font normalFont = new Font(Font.HELVETICA, 9, Font.NORMAL, DARK_TEXT);
            Font boldFont   = new Font(Font.HELVETICA, 9, Font.BOLD, DARK_TEXT);
            Font mutedFont  = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED);
            Font totalFont  = new Font(Font.HELVETICA, 11, Font.BOLD, PRIMARY);

            addHeaderSection(doc, facture, config, settings, titleFont, normalFont, mutedFont);

            Map<VatRate, BigDecimal[]> vatBreakdown = new LinkedHashMap<>();
            addItemsTableSection(doc, facture, settings, headerFont, normalFont, vatBreakdown);

            addTotalsAndVatSection(doc, facture, settings, vatBreakdown, boldFont, totalFont, mutedFont);

            if (facture.getNotes() != null && !facture.getNotes().isBlank()) {
                doc.add(new Paragraph("Notes : " + facture.getNotes(), mutedFont));
                doc.add(Chunk.NEWLINE);
            }

            addLegalFooterSection(doc, config, mutedFont);

            doc.close();
            return out.toByteArray();

        } catch (DocumentException | IOException e) {
            throw new IllegalStateException("Error generating invoice PDF " + facture.getId(), e);
        }
    }

    private void addHeaderSection(Document doc, Facture facture, EstablishmentConfig config, AppSettings settings,
                                  Font titleFont, Font normalFont, Font mutedFont) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{1.2f, 1f});

        headerTable.addCell(buildEstablishmentCell(config, settings, normalFont, mutedFont));
        headerTable.addCell(buildMetadataCell(facture, config, titleFont, normalFont));

        doc.add(headerTable);
        doc.add(Chunk.NEWLINE);
    }

    private PdfPCell buildEstablishmentCell(EstablishmentConfig config, AppSettings settings, Font normalFont, Font mutedFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.addElement(new Paragraph(config.getLegalName(), new Font(Font.HELVETICA, 14, Font.BOLD, PRIMARY)));

        String legalFormText = config.getLegalForm() != null ? config.getLegalForm() : "";
        if (config.getCapitalSocial() != null) {
            boolean isEn = "en".equalsIgnoreCase(config.getLanguage());
            legalFormText += (isEn ? " share capital of " : " au capital de ") + formatPrix(config.getCapitalSocial().doubleValue(), settings);
        }
        if (!legalFormText.isBlank()) {
            cell.addElement(new Paragraph(legalFormText, mutedFont));
        }

        if (config.getAddress() != null) {
            cell.addElement(new Paragraph(config.getAddress(), normalFont));
        }

        String phoneStr = config.getPhone() != null ? config.getPhone() : "-";
        String emailStr = config.getEmail() != null ? config.getEmail() : "-";
        cell.addElement(new Paragraph("Tél : " + phoneStr + " | " + emailStr, mutedFont));

        String siretStr = config.getSiret() != null ? config.getSiret() : "-";
        String rcsCityStr = config.getRcsCity() != null ? config.getRcsCity() : "";
        String rcsNumStr = config.getRcsNumber() != null ? config.getRcsNumber() : "";
        cell.addElement(new Paragraph("SIRET : " + siretStr + " | RCS : " + rcsCityStr + " " + rcsNumStr, mutedFont));

        String tvaStr = config.getTvaNumber() != null ? config.getTvaNumber() : "-";
        String apeStr = config.getCodeApe() != null ? config.getCodeApe() : "-";
        cell.addElement(new Paragraph("N° TVA Intracommunautaire : " + tvaStr + " | APE : " + apeStr, mutedFont));
        return cell;
    }

    private PdfPCell buildMetadataCell(Facture facture, EstablishmentConfig config, Font titleFont, Font normalFont) {
        boolean isEn = "en".equalsIgnoreCase(config.getLanguage());
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);

        Paragraph pTitle = new Paragraph(isEn ? "INVOICE" : "FACTURE", titleFont);
        pTitle.setAlignment(Element.ALIGN_RIGHT);
        cell.addElement(pTitle);

        String numStr = facture.getNumero() != null ? facture.getNumero() : "-";
        Paragraph pNum = new Paragraph((isEn ? "No. " : "N° ") + numStr, new Font(Font.HELVETICA, 12, Font.BOLD, DARK_TEXT));
        pNum.setAlignment(Element.ALIGN_RIGHT);
        cell.addElement(pNum);

        if (facture.getDateFacture() != null) {
            addMetadataLine(cell, isEn ? "Date: " : "Date : ", facture.getDateFacture().format(DATE_FMT), normalFont);
        }
        if (facture.getTable() != null) {
            addMetadataLine(cell, isEn ? "Table: " : "Table : ", String.valueOf(facture.getTable().getNumero()), normalFont);
        }
        if (facture.getModePaiement() != null) {
            addMetadataLine(cell, isEn ? "Payment method: " : "Mode de paiement : ", facture.getModePaiement(), normalFont);
        }

        String statutText = getFactureStatusLabel(facture.isReglee(), isEn);
        Color statutColor = facture.isReglee() ? new Color(16, 185, 129) : new Color(245, 158, 11);
        Paragraph pStatut = new Paragraph(statutText, new Font(Font.HELVETICA, 9, Font.BOLD, statutColor));
        pStatut.setAlignment(Element.ALIGN_RIGHT);
        cell.addElement(pStatut);
        return cell;
    }

    private void addMetadataLine(PdfPCell cell, String prefix, String value, Font font) {
        Paragraph p = new Paragraph(prefix + value, font);
        p.setAlignment(Element.ALIGN_RIGHT);
        cell.addElement(p);
    }

    private String getFactureStatusLabel(boolean isReglee, boolean isEn) {
        if (isEn) {
            return isReglee ? "PAID" : "PENDING SETTLEMENT";
        }
        return isReglee ? "RÉGLÉE" : "EN ATTENTE DE RÈGLEMENT";
    }

    private void addItemsTableSection(Document doc, Facture facture, AppSettings settings, Font headerFont, Font normalFont,
                                      Map<VatRate, BigDecimal[]> vatBreakdown) throws DocumentException {
        EstablishmentConfig config = (establishmentConfigService != null) ? establishmentConfigService.getConfig() : null;
        boolean isEn = config != null && "en".equalsIgnoreCase(config.getLanguage());

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3.5f, 1f, 1.5f, 1.2f, 1.5f, 1.8f});

        String[] headers = isEn
            ? new String[]{"Item", "Qty", "Unit Price HT", "VAT Rate", "Total HT", "Total Incl. VAT"}
            : new String[]{"Article", "Qté", "P.U. HT", "Taux TVA", "Total HT", TOTAL_TTC_HEADER};

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(SURFACE);
            cell.setPadding(6);
            cell.setBorderColor(PRIMARY);
            boolean isRightAlign = "Qté".equals(header) || "Qty".equals(header) || header.startsWith("P.U") || header.startsWith("Unit") || header.startsWith("Total") || header.startsWith("Taux") || header.startsWith("VAT");
            cell.setHorizontalAlignment(isRightAlign ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
            table.addCell(cell);
        }

        if (facture.getItems() != null) {
            for (FactureItem item : facture.getItems()) {
                addItemRow(table, item, settings, normalFont, vatBreakdown);
            }
        }

        doc.add(table);
        doc.add(Chunk.NEWLINE);
    }

    private void addItemRow(PdfPTable table, FactureItem item, AppSettings settings, Font normalFont, Map<VatRate, BigDecimal[]> vatBreakdown) {
        VatRate vatRate = item.getVatRate() != null ? item.getVatRate() : VatRate.TWENTY;

        double totalItemTTC = getItemTotalTTC(item);

        BigDecimal bdTotalTTC = BigDecimal.valueOf(totalItemTTC).setScale(2, RoundingMode.HALF_UP);
        BigDecimal bdPriceHT = (item.getPriceHT() != null)
            ? item.getPriceHT()
            : bdTotalTTC.divide(BigDecimal.ONE.add(vatRate.getRate()), 2, RoundingMode.HALF_UP);
        BigDecimal bdVatAmount = (item.getVatAmount() != null)
            ? item.getVatAmount()
            : bdTotalTTC.subtract(bdPriceHT);

        int qty = Math.max(1, item.getQuantite());
        BigDecimal bdPuHT = bdPriceHT.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP);

        vatBreakdown.computeIfAbsent(vatRate, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
        BigDecimal[] acc = vatBreakdown.get(vatRate);
        acc[0] = acc[0].add(bdPriceHT);
        acc[1] = acc[1].add(bdVatAmount);
        acc[2] = acc[2].add(bdTotalTTC);

        String desc = item.getDescription() != null ? item.getDescription() : "";
        addCell(table, desc, normalFont, Element.ALIGN_LEFT);
        addCell(table, String.valueOf(item.getQuantite()), normalFont, Element.ALIGN_RIGHT);
        addCell(table, formatPrix(bdPuHT.doubleValue(), settings), normalFont, Element.ALIGN_RIGHT);
        addCell(table, vatRate.getLabel(), normalFont, Element.ALIGN_RIGHT);
        addCell(table, formatPrix(bdPriceHT.doubleValue(), settings), normalFont, Element.ALIGN_RIGHT);
        addCell(table, formatPrix(bdTotalTTC.doubleValue(), settings), normalFont, Element.ALIGN_RIGHT);
    }

    private double getItemTotalTTC(FactureItem item) {
        if (item.getTotal() != null) {
            return item.getTotal().doubleValue();
        }
        if (item.getPrixUnitaire() != null) {
            return item.getPrixUnitaire().doubleValue() * item.getQuantite();
        }
        return 0.0;
    }

    private void addTotalsAndVatSection(Document doc, Facture facture, AppSettings settings, Map<VatRate, BigDecimal[]> vatBreakdown,
                                        Font boldFont, Font totalFont, Font mutedFont) throws DocumentException {
        PdfPTable totalsTable = new PdfPTable(2);
        totalsTable.setWidthPercentage(100);
        totalsTable.setWidths(new float[]{1.5f, 1f});

        EstablishmentConfig config = (establishmentConfigService != null) ? establishmentConfigService.getConfig() : null;
        totalsTable.addCell(buildVatBreakdownCell(vatBreakdown, settings, config, mutedFont));
        totalsTable.addCell(buildSummaryCell(facture, settings, config, vatBreakdown, boldFont, totalFont, mutedFont));

        doc.add(totalsTable);
        doc.add(Chunk.NEWLINE);
    }

    private PdfPCell buildVatBreakdownCell(Map<VatRate, BigDecimal[]> vatBreakdown, AppSettings settings, EstablishmentConfig config, Font mutedFont) {
        boolean isEn = config != null && "en".equalsIgnoreCase(config.getLanguage());
        PdfPCell vatCell = new PdfPCell();
        vatCell.setBorder(Rectangle.NO_BORDER);

        Paragraph vatTitle = new Paragraph(isEn ? "VAT BREAKDOWN" : "VENTILATION TVA", new Font(Font.HELVETICA, 9, Font.BOLD, PRIMARY));
        vatCell.addElement(vatTitle);

        PdfPTable vatTable = new PdfPTable(4);
        vatTable.setWidthPercentage(100);
        try {
            vatTable.setWidths(new float[]{1.2f, 1.5f, 1.5f, 1.5f});
        } catch (DocumentException _) {
            // Unreachable for valid widths
        }

        String[] headers = isEn
            ? new String[]{"Rate", BASE_HT_HEADER, "VAT", "Total Incl. VAT"}
            : new String[]{"Taux", BASE_HT_HEADER, "TVA", TOTAL_TTC_HEADER};

        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, new Font(Font.HELVETICA, 8, Font.BOLD, TEXT)));
            c.setBackgroundColor(SURFACE);
            c.setPadding(4);
            vatTable.addCell(c);
        }

        for (Map.Entry<VatRate, BigDecimal[]> entry : vatBreakdown.entrySet()) {
            addCell(vatTable, entry.getKey().getLabel(), mutedFont, Element.ALIGN_LEFT);
            addCell(vatTable, formatPrix(entry.getValue()[0].doubleValue(), settings), mutedFont, Element.ALIGN_RIGHT);
            addCell(vatTable, formatPrix(entry.getValue()[1].doubleValue(), settings), mutedFont, Element.ALIGN_RIGHT);
            addCell(vatTable, formatPrix(entry.getValue()[2].doubleValue(), settings), mutedFont, Element.ALIGN_RIGHT);
        }
        vatCell.addElement(vatTable);
        return vatCell;
    }

    private PdfPCell buildSummaryCell(Facture facture, AppSettings settings, EstablishmentConfig config, Map<VatRate, BigDecimal[]> vatBreakdown,
                                     Font boldFont, Font totalFont, Font mutedFont) {
        boolean isEn = config != null && "en".equalsIgnoreCase(config.getLanguage());
        PdfPCell summaryCell = new PdfPCell();
        summaryCell.setBorder(Rectangle.NO_BORDER);

        double totalTTCVal = getFactureTotalTTC(facture);
        double totalHTVal = (facture.getTotalHT() != null)
            ? facture.getTotalHT().doubleValue()
            : vatBreakdown.values().stream().mapToDouble(a -> a[0].doubleValue()).sum();
        double totalVATVal = (facture.getTotalVAT() != null)
            ? facture.getTotalVAT().doubleValue()
            : vatBreakdown.values().stream().mapToDouble(a -> a[1].doubleValue()).sum();
        double pourboireVal = (facture.getPourboire() != null) ? facture.getPourboire().doubleValue() : 0;

        Paragraph pTotalHT = new Paragraph((isEn ? "Total Excl. VAT : " : "Total HT : ") + formatPrix(totalHTVal, settings), boldFont);
        pTotalHT.setAlignment(Element.ALIGN_RIGHT);
        summaryCell.addElement(pTotalHT);

        Paragraph pTotalVAT = new Paragraph((isEn ? "Total VAT : " : "Total TVA : ") + formatPrix(totalVATVal, settings), boldFont);
        pTotalVAT.setAlignment(Element.ALIGN_RIGHT);
        summaryCell.addElement(pTotalVAT);

        if (pourboireVal > 0) {
            Paragraph pTip = new Paragraph((isEn ? "Tip : " : "Pourboire : ") + formatPrix(pourboireVal, settings), mutedFont);
            pTip.setAlignment(Element.ALIGN_RIGHT);
            summaryCell.addElement(pTip);
        }

        Paragraph pTotalTTC = new Paragraph((isEn ? "TOTAL INCL. VAT : " : "TOTAL TTC : ") + formatPrix(totalTTCVal, settings), totalFont);
        pTotalTTC.setAlignment(Element.ALIGN_RIGHT);
        summaryCell.addElement(pTotalTTC);
        return summaryCell;
    }

    private double getFactureTotalTTC(Facture facture) {
        if (facture.getTotalTTC() != null) {
            return facture.getTotalTTC().doubleValue();
        }
        if (facture.getTotal() != null) {
            return facture.getTotal().doubleValue();
        }
        return 0.0;
    }

    private void addLegalFooterSection(Document doc, EstablishmentConfig config, Font mutedFont) throws DocumentException {
        boolean isEn = config != null && "en".equalsIgnoreCase(config.getLanguage());
        Paragraph legalTitle = new Paragraph(
            isEn ? "LEGAL NOTICE & PAYMENT TERMS" : "MENTIONS LÉGALES & CONDITIONS DE PAIEMENT",
            new Font(Font.HELVETICA, 8, Font.BOLD, MUTED)
        );
        doc.add(legalTitle);

        String payTerms = resolvePaymentTerms(config, isEn);
        String discPolicy = resolveDiscountPolicy(config, isEn);
        String lateRateStr = resolveLatePaymentRate(config);

        doc.add(new Paragraph((isEn ? "Payment terms : " : "Conditions de règlement : ") + payTerms, mutedFont));
        doc.add(new Paragraph((isEn ? "Discount policy : " : "Politique d'escompte : ") + discPolicy, mutedFont));
        doc.add(new Paragraph(isEn
            ? "Late payment penalties : Annual rate of " + lateRateStr + " applicable automatically as of the due date. Fixed indemnity for recovery costs: 40 €."
            : "Pénalités de retard : Taux annuel de " + lateRateStr + " applicables de plein droit à compter de la date d'échéance. Indemnité forfaitaire pour frais de recouvrement : 40 € (C. Com. Art. L441-10).", mutedFont));

        doc.add(Chunk.NEWLINE);
        String name = (config != null && config.getLegalName() != null) ? config.getLegalName() : "OpenBar";
        Paragraph footer = new Paragraph(isEn ? name + " — Thank you for your visit!" : name + " — Merci de votre visite !", mutedFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);
    }

    private String resolvePaymentTerms(EstablishmentConfig config, boolean isEn) {
        if (config != null && config.getPaymentTerms() != null) {
            return config.getPaymentTerms();
        }
        return isEn ? "Immediate payment upon receipt" : "Paiement immédiat à réception";
    }

    private String resolveDiscountPolicy(EstablishmentConfig config, boolean isEn) {
        if (config != null && config.getDiscountPolicy() != null) {
            return config.getDiscountPolicy();
        }
        return isEn ? "No discount for early payment" : "Aucun escompte pour paiement anticipé";
    }

    private String resolveLatePaymentRate(EstablishmentConfig config) {
        if (config != null && config.getLatePaymentRate() != null) {
            return String.format(Locale.US, "%.2f", config.getLatePaymentRate().doubleValue() * 100) + "%";
        }
        return "12.00%";
    }

    private void addCell(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setBorderColor(Color.LIGHT_GRAY);
        cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    private String formatPrix(double prix, AppSettings settings) {
        String symbol = (settings != null && settings.getCurrencySymbol() != null) ? settings.getCurrencySymbol() : "€";
        CurrencyPosition pos = (settings != null && settings.getCurrencyPosition() != null) ? settings.getCurrencyPosition() : CurrencyPosition.AFTER;
        String formatted = String.format(Locale.FRANCE, "%.2f", prix);
        if (pos == CurrencyPosition.BEFORE) {
            return symbol + " " + formatted;
        }
        return formatted + " " + symbol;
    }

    /**
     * Generates a legal Z-Report A4 PDF closing report for the given daily summary.
     *
     * @param recap Daily summary DTO
     * @return PDF byte array
     */
    public byte[] generateDailyRecapPdf(com.bar.gestioncocktail.dto.DailyRecapDTO recap) {
        EstablishmentConfig config = (establishmentConfigService != null)
            ? establishmentConfigService.getConfig()
            : new EstablishmentConfig();
        if (config == null) config = new EstablishmentConfig();

        AppSettings settings = (appSettingsService != null)
            ? appSettingsService.getSettings()
            : new AppSettings();
        if (settings == null) settings = new AppSettings();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPdfVersion(PdfWriter.PDF_VERSION_1_7);
            doc.open();

            Font titleFont  = new Font(Font.HELVETICA, 18, Font.BOLD, PRIMARY);
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, TEXT);
            Font normalFont = new Font(Font.HELVETICA, 9, Font.NORMAL, DARK_TEXT);
            Font boldFont   = new Font(Font.HELVETICA, 9, Font.BOLD, DARK_TEXT);
            Font mutedFont  = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED);
            Font kpiFont    = new Font(Font.HELVETICA, 11, Font.BOLD, PRIMARY);

            String formattedDate = recap.date().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            Paragraph title = new Paragraph("RÉCAPITULATIF DE CAISSE DU " + formattedDate, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            doc.add(title);
            doc.add(new Paragraph("Établissement : " + config.getLegalName() + " — SIRET : " + config.getSiret(), mutedFont));
            doc.add(Chunk.NEWLINE);

            PdfPTable kpiTable = new PdfPTable(4);
            kpiTable.setWidthPercentage(100);
            addCell(kpiTable, "CA Total TTC\n" + formatPrix(recap.totalCaTtc().doubleValue(), settings), kpiFont, Element.ALIGN_CENTER);
            addCell(kpiTable, "CA Total HT\n" + formatPrix(recap.totalCaHt().doubleValue(), settings), kpiFont, Element.ALIGN_CENTER);
            addCell(kpiTable, "Factures Réglées\n" + recap.nombreFacturesReglees(), kpiFont, Element.ALIGN_CENTER);
            addCell(kpiTable, "Panier Moyen\n" + formatPrix(recap.panierMoyen().doubleValue(), settings), kpiFont, Element.ALIGN_CENTER);
            doc.add(kpiTable);
            doc.add(Chunk.NEWLINE);

            doc.add(new Paragraph("VENTILATION PAR MODE DE RÈGLEMENT", boldFont));
            PdfPTable pmTable = new PdfPTable(3);
            pmTable.setWidthPercentage(100);
            applyTableWidths(pmTable, new float[]{2f, 1f, 1.5f});
            for (String h : new String[]{"Mode de Règlement", "Nombre", TOTAL_TTC_HEADER}) {
                PdfPCell c = new PdfPCell(new Phrase(h, headerFont));
                c.setBackgroundColor(SURFACE);
                c.setPadding(4);
                pmTable.addCell(c);
            }
            if (recap.ventilationModePaiement() != null) {
                for (com.bar.gestioncocktail.dto.PaymentModeSummaryDTO pm : recap.ventilationModePaiement()) {
                    addCell(pmTable, pm.modePaiement(), normalFont, Element.ALIGN_LEFT);
                    addCell(pmTable, String.valueOf(pm.count()), normalFont, Element.ALIGN_CENTER);
                    addCell(pmTable, formatPrix(pm.totalTtc().doubleValue(), settings), boldFont, Element.ALIGN_RIGHT);
                }
            }
            doc.add(pmTable);
            doc.add(Chunk.NEWLINE);

            doc.add(new Paragraph("VENTILATION DE LA TVA", boldFont));
            PdfPTable vatTable = new PdfPTable(4);
            vatTable.setWidthPercentage(100);
            applyTableWidths(vatTable, new float[]{1.2f, 1.5f, 1.5f, 1.5f});
            for (String h : new String[]{"Taux TVA", BASE_HT_HEADER, "Montant TVA", TOTAL_TTC_HEADER}) {
                PdfPCell c = new PdfPCell(new Phrase(h, headerFont));
                c.setBackgroundColor(SURFACE);
                c.setPadding(4);
                vatTable.addCell(c);
            }
            if (recap.ventilationTva() != null) {
                for (com.bar.gestioncocktail.dto.VatSummaryDTO vat : recap.ventilationTva()) {
                    addCell(vatTable, vat.tauxLabel(), normalFont, Element.ALIGN_LEFT);
                    addCell(vatTable, formatPrix(vat.baseHt().doubleValue(), settings), normalFont, Element.ALIGN_RIGHT);
                    addCell(vatTable, formatPrix(vat.montantTva().doubleValue(), settings), normalFont, Element.ALIGN_RIGHT);
                    addCell(vatTable, formatPrix(vat.totalTtc().doubleValue(), settings), boldFont, Element.ALIGN_RIGHT);
                }
            }
            doc.add(vatTable);
            doc.add(Chunk.NEWLINE);

            addLegalFooterSection(doc, config, mutedFont);

            doc.close();
            return out.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new IllegalStateException("Error generating daily recap PDF for " + recap.date(), e);
        }
    }

    private void applyTableWidths(PdfPTable table, float[] widths) {
        try {
            table.setWidths(widths);
        } catch (DocumentException _) {
            // Ignore
        }
    }
}
