package com.bar.gestioncocktail.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
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
 * Service for generating legal A4 invoice PDF documents using OpenPDF.
 */
@Service
public class PdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color PRIMARY = new Color(108, 127, 232);  // #6c7fe8
    private static final Color SURFACE = new Color(33, 38, 63);    // #21263f
    private static final Color TEXT    = new Color(236, 238, 251);  // #eceefb
    private static final Color MUTED   = new Color(126, 135, 168); // #7e87a8
    private static final Color DARK_TEXT = new Color(30, 30, 45);

    private final EstablishmentConfigService establishmentConfigService;

    public PdfService(EstablishmentConfigService establishmentConfigService) {
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Generates an A4 PDF invoice document for the given facture entity.
     *
     * @param facture the invoice entity
     * @return PDF content as byte array
     */
    public byte[] generateFacturePdf(Facture facture) {
        EstablishmentConfig config = establishmentConfigService != null 
            ? establishmentConfigService.getConfig() 
            : new EstablishmentConfig();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 40, 40);
            try {
                PdfWriter writer = PdfWriter.getInstance(doc, out);
                writer.setPdfVersion(PdfWriter.PDF_VERSION_1_7);
                doc.open();

                Font titleFont  = new Font(Font.HELVETICA, 20, Font.BOLD, PRIMARY);
                Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, TEXT);
                Font normalFont = new Font(Font.HELVETICA, 9, Font.NORMAL, DARK_TEXT);
                Font boldFont   = new Font(Font.HELVETICA, 9, Font.BOLD, DARK_TEXT);
                Font mutedFont  = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED);
                Font totalFont  = new Font(Font.HELVETICA, 11, Font.BOLD, PRIMARY);

                // --- En-tête 2 Colonnes (Établissement & Invoce Info) ---
                PdfPTable headerTable = new PdfPTable(2);
                headerTable.setWidthPercentage(100);
                headerTable.setWidths(new float[]{1.2f, 1f});

                // Colonne 1: Établissement
                PdfPCell etabCell = new PdfPCell();
                etabCell.setBorder(Rectangle.NO_BORDER);
                etabCell.addElement(new Paragraph(config.getLegalName(), new Font(Font.HELVETICA, 14, Font.BOLD, PRIMARY)));
                if (config.getLegalForm() != null) {
                    etabCell.addElement(new Paragraph(config.getLegalForm() + (config.getCapitalSocial() != null ? " au capital de " + config.getCapitalSocial() + " €" : ""), mutedFont));
                }
                if (config.getAddress() != null) {
                    etabCell.addElement(new Paragraph(config.getAddress(), normalFont));
                }
                if (config.getPhone() != null || config.getEmail() != null) {
                    etabCell.addElement(new Paragraph("Tél : " + (config.getPhone() != null ? config.getPhone() : "-") + " | " + (config.getEmail() != null ? config.getEmail() : ""), mutedFont));
                }
                etabCell.addElement(new Paragraph("SIRET : " + (config.getSiret() != null ? config.getSiret() : "-") + " | RCS : " + (config.getRcsCity() != null ? config.getRcsCity() : "") + " " + (config.getRcsNumber() != null ? config.getRcsNumber() : ""), mutedFont));
                etabCell.addElement(new Paragraph("N° TVA Intracommunautaire : " + (config.getTvaNumber() != null ? config.getTvaNumber() : "-") + " | APE : " + (config.getCodeApe() != null ? config.getCodeApe() : "-"), mutedFont));
                headerTable.addCell(etabCell);

                // Colonne 2: Facture Meta
                PdfPCell metaCell = new PdfPCell();
                metaCell.setBorder(Rectangle.NO_BORDER);
                Paragraph pTitle = new Paragraph("FACTURE", titleFont);
                pTitle.setAlignment(Element.ALIGN_RIGHT);
                metaCell.addElement(pTitle);
                
                Paragraph pNum = new Paragraph("N° " + (facture.getNumero() != null ? facture.getNumero() : "-"), new Font(Font.HELVETICA, 12, Font.BOLD, DARK_TEXT));
                pNum.setAlignment(Element.ALIGN_RIGHT);
                metaCell.addElement(pNum);

                if (facture.getDateFacture() != null) {
                    Paragraph pDate = new Paragraph("Date : " + facture.getDateFacture().format(DATE_FMT), normalFont);
                    pDate.setAlignment(Element.ALIGN_RIGHT);
                    metaCell.addElement(pDate);
                }
                if (facture.getTable() != null) {
                    Paragraph pTable = new Paragraph("Table : " + facture.getTable().getNumero(), normalFont);
                    pTable.setAlignment(Element.ALIGN_RIGHT);
                    metaCell.addElement(pTable);
                }
                if (facture.getModePaiement() != null) {
                    Paragraph pPaiement = new Paragraph("Mode de paiement : " + facture.getModePaiement(), normalFont);
                    pPaiement.setAlignment(Element.ALIGN_RIGHT);
                    metaCell.addElement(pPaiement);
                }
                String statutText = facture.isReglee() ? "RÉGLÉE" : "EN ATTENTE DE RÈGLEMENT";
                Color statutColor = facture.isReglee() ? new Color(16, 185, 129) : new Color(245, 158, 11);
                Paragraph pStatut = new Paragraph(statutText, new Font(Font.HELVETICA, 9, Font.BOLD, statutColor));
                pStatut.setAlignment(Element.ALIGN_RIGHT);
                metaCell.addElement(pStatut);

                headerTable.addCell(metaCell);
                doc.add(headerTable);
                doc.add(Chunk.NEWLINE);

                // --- Tableau des Lignes de Commande ---
                PdfPTable table = new PdfPTable(6);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{3.5f, 1f, 1.5f, 1.2f, 1.5f, 1.8f});

                for (String header : new String[]{"Article", "Qté", "P.U. HT", "Taux TVA", "Total HT", "Total TTC"}) {
                    PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                    cell.setBackgroundColor(SURFACE);
                    cell.setPadding(6);
                    cell.setBorderColor(PRIMARY);
                    cell.setHorizontalAlignment("Qté".equals(header) || header.startsWith("P.U") || header.startsWith("Total") || header.startsWith("Taux") ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                    table.addCell(cell);
                }

                Map<VatRate, BigDecimal[]> vatBreakdown = new LinkedHashMap<>();

                if (facture.getItems() != null) {
                    for (FactureItem item : facture.getItems()) {
                        VatRate vatRate = item.getVatRate() != null ? item.getVatRate() : VatRate.TWENTY;
                        double totalItemTTC = item.getTotal() != null ? item.getTotal().doubleValue()
                            : (item.getPrixUnitaire() != null ? item.getPrixUnitaire().doubleValue() * item.getQuantite() : 0);
                        
                        BigDecimal bdTotalTTC = BigDecimal.valueOf(totalItemTTC).setScale(2, RoundingMode.HALF_UP);
                        BigDecimal bdPriceHT = item.getPriceHT() != null ? item.getPriceHT()
                            : bdTotalTTC.divide(BigDecimal.ONE.add(vatRate.getRate()), 2, RoundingMode.HALF_UP);
                        BigDecimal bdVatAmount = item.getVatAmount() != null ? item.getVatAmount()
                            : bdTotalTTC.subtract(bdPriceHT);
                        BigDecimal bdPuHT = bdPriceHT.divide(BigDecimal.valueOf(Math.max(1, item.getQuantite())), 2, RoundingMode.HALF_UP);

                        // Collect VAT breakdown: [Base HT, Montant TVA, Total TTC]
                        vatBreakdown.computeIfAbsent(vatRate, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
                        BigDecimal[] acc = vatBreakdown.get(vatRate);
                        acc[0] = acc[0].add(bdPriceHT);
                        acc[1] = acc[1].add(bdVatAmount);
                        acc[2] = acc[2].add(bdTotalTTC);

                        addCell(table, item.getDescription() != null ? item.getDescription() : "", normalFont, Element.ALIGN_LEFT);
                        addCell(table, String.valueOf(item.getQuantite()), normalFont, Element.ALIGN_RIGHT);
                        addCell(table, formatPrix(bdPuHT.doubleValue()), normalFont, Element.ALIGN_RIGHT);
                        addCell(table, vatRate.getLabel(), normalFont, Element.ALIGN_RIGHT);
                        addCell(table, formatPrix(bdPriceHT.doubleValue()), normalFont, Element.ALIGN_RIGHT);
                        addCell(table, formatPrix(bdTotalTTC.doubleValue()), normalFont, Element.ALIGN_RIGHT);
                    }
                }

                doc.add(table);
                doc.add(Chunk.NEWLINE);

                // --- Ventilation TVA & Totaux ---
                PdfPTable totalsTable = new PdfPTable(2);
                totalsTable.setWidthPercentage(100);
                totalsTable.setWidths(new float[]{1.5f, 1f});

                // Gauche: Tableau de Ventilation TVA
                PdfPCell vatCell = new PdfPCell();
                vatCell.setBorder(Rectangle.NO_BORDER);
                
                Paragraph vatTitle = new Paragraph("VENTILATION TVA", new Font(Font.HELVETICA, 9, Font.BOLD, PRIMARY));
                vatCell.addElement(vatTitle);

                PdfPTable vatTable = new PdfPTable(4);
                vatTable.setWidthPercentage(100);
                vatTable.setWidths(new float[]{1.2f, 1.5f, 1.5f, 1.5f});

                for (String h : new String[]{"Taux", "Base HT", "TVA", "Total TTC"}) {
                    PdfPCell c = new PdfPCell(new Phrase(h, new Font(Font.HELVETICA, 8, Font.BOLD, TEXT)));
                    c.setBackgroundColor(SURFACE);
                    c.setPadding(4);
                    vatTable.addCell(c);
                }

                for (Map.Entry<VatRate, BigDecimal[]> entry : vatBreakdown.entrySet()) {
                    addCell(vatTable, entry.getKey().getLabel(), mutedFont, Element.ALIGN_LEFT);
                    addCell(vatTable, formatPrix(entry.getValue()[0].doubleValue()), mutedFont, Element.ALIGN_RIGHT);
                    addCell(vatTable, formatPrix(entry.getValue()[1].doubleValue()), mutedFont, Element.ALIGN_RIGHT);
                    addCell(vatTable, formatPrix(entry.getValue()[2].doubleValue()), mutedFont, Element.ALIGN_RIGHT);
                }
                vatCell.addElement(vatTable);
                totalsTable.addCell(vatCell);

                // Droite: Totaux généraux HT, TVA, TTC
                PdfPCell summaryCell = new PdfPCell();
                summaryCell.setBorder(Rectangle.NO_BORDER);

                double totalTTCVal = facture.getTotalTTC() != null ? facture.getTotalTTC().doubleValue()
                    : (facture.getTotal() != null ? facture.getTotal().doubleValue() : 0);
                double totalHTVal = facture.getTotalHT() != null ? facture.getTotalHT().doubleValue()
                    : vatBreakdown.values().stream().mapToDouble(a -> a[0].doubleValue()).sum();
                double totalVATVal = facture.getTotalVAT() != null ? facture.getTotalVAT().doubleValue()
                    : vatBreakdown.values().stream().mapToDouble(a -> a[1].doubleValue()).sum();
                double pourboireVal = facture.getPourboire() != null ? facture.getPourboire().doubleValue() : 0;

                Paragraph pTotalHT = new Paragraph("Total HT : " + formatPrix(totalHTVal), boldFont);
                pTotalHT.setAlignment(Element.ALIGN_RIGHT);
                summaryCell.addElement(pTotalHT);

                Paragraph pTotalVAT = new Paragraph("Total TVA : " + formatPrix(totalVATVal), boldFont);
                pTotalVAT.setAlignment(Element.ALIGN_RIGHT);
                summaryCell.addElement(pTotalVAT);

                if (pourboireVal > 0) {
                    Paragraph pTip = new Paragraph("Pourboire : " + formatPrix(pourboireVal), mutedFont);
                    pTip.setAlignment(Element.ALIGN_RIGHT);
                    summaryCell.addElement(pTip);
                }

                Paragraph pTotalTTC = new Paragraph("TOTAL TTC : " + formatPrix(totalTTCVal), totalFont);
                pTotalTTC.setAlignment(Element.ALIGN_RIGHT);
                summaryCell.addElement(pTotalTTC);

                totalsTable.addCell(summaryCell);
                doc.add(totalsTable);
                doc.add(Chunk.NEWLINE);

                // Notes éventuelles
                if (facture.getNotes() != null && !facture.getNotes().isBlank()) {
                    doc.add(new Paragraph("Notes : " + facture.getNotes(), mutedFont));
                    doc.add(Chunk.NEWLINE);
                }

                // --- Mentions Légales Obligatoires ---
                Paragraph legalTitle = new Paragraph("MENTIONS LÉGALES & CONDITIONS DE PAIEMENT", new Font(Font.HELVETICA, 8, Font.BOLD, MUTED));
                doc.add(legalTitle);
                
                String payTerms = config.getPaymentTerms() != null ? config.getPaymentTerms() : "Paiement immédiat à réception";
                String discPolicy = config.getDiscountPolicy() != null ? config.getDiscountPolicy() : "Aucun escompte pour paiement anticipé";
                String lateRateStr = config.getLatePaymentRate() != null 
                    ? String.format(Locale.US, "%.2f", config.getLatePaymentRate().doubleValue() * 100) + "%" 
                    : "12.00%";
                
                doc.add(new Paragraph("Conditions de règlement : " + payTerms, mutedFont));
                doc.add(new Paragraph("Politique d'escompte : " + discPolicy, mutedFont));
                doc.add(new Paragraph("Pénalités de retard : Taux annuel de " + lateRateStr + " applicables de plein droit à compter de la date d'échéance. Indemnité forfaitaire pour frais de recouvrement : 40 € (C. Com. Art. L441-10).", mutedFont));
                
                doc.add(Chunk.NEWLINE);
                Paragraph footer = new Paragraph(config.getLegalName() + " — Merci de votre visite !", mutedFont);
                footer.setAlignment(Element.ALIGN_CENTER);
                doc.add(footer);

            } finally {
                doc.close();
            }
            return out.toByteArray();

        } catch (DocumentException | IOException e) {
            throw new IllegalStateException("Erreur génération PDF facture " + facture.getId(), e);
        }
    }

    private void addCell(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setBorderColor(Color.LIGHT_GRAY);
        cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    private String formatPrix(double prix) {
        return String.format(Locale.FRANCE, "%.2f €", prix);
    }
}

