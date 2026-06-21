package com.bar.gestioncocktail.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color PRIMARY = new Color(108, 127, 232);  // #6c7fe8
    private static final Color SURFACE = new Color(33, 38, 63);    // #21263f
    private static final Color TEXT    = new Color(236, 238, 251);  // #eceefb
    private static final Color MUTED   = new Color(126, 135, 168); // #7e87a8

    public byte[] generateFacturePdf(Facture facture) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 60, 40);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont  = new Font(Font.HELVETICA, 20, Font.BOLD,   PRIMARY);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD,   TEXT);
            Font normalFont = new Font(Font.HELVETICA, 10, Font.NORMAL, TEXT);
            Font mutedFont  = new Font(Font.HELVETICA,  9, Font.NORMAL, MUTED);
            Font totalFont  = new Font(Font.HELVETICA, 12, Font.BOLD,   PRIMARY);

            // En-tête
            Paragraph title = new Paragraph("FACTURE", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            doc.add(title);
            doc.add(Chunk.NEWLINE);

            // Informations facture
            doc.add(new Paragraph("N° " + facture.getNumero(), headerFont));
            if (facture.getDateFacture() != null) {
                doc.add(new Paragraph("Date : " + facture.getDateFacture().format(DATE_FMT), normalFont));
            }
            if (facture.getTable() != null) {
                doc.add(new Paragraph("Table : " + facture.getTable().getNumero(), normalFont));
            }
            if (facture.getModePaiement() != null) {
                doc.add(new Paragraph("Mode de paiement : " + facture.getModePaiement(), normalFont));
            }
            doc.add(Chunk.NEWLINE);

            // Tableau des articles
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{4f, 1.5f, 2f, 2f});

            for (String header : new String[]{"Article", "Qté", "Prix unit.", "Total"}) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setBackgroundColor(SURFACE);
                cell.setPadding(8);
                cell.setBorderColor(PRIMARY);
                table.addCell(cell);
            }

            if (facture.getItems() != null) {
                for (FactureItem item : facture.getItems()) {
                    double prixUnit = item.getPrixUnitaire() != null ? item.getPrixUnitaire().doubleValue() : 0;
                    double montant  = item.getTotal() != null ? item.getTotal().doubleValue()
                                    : prixUnit * item.getQuantite();

                    addCell(table, item.getDescription() != null ? item.getDescription() : "", normalFont);
                    addCell(table, String.valueOf(item.getQuantite()), normalFont);
                    addCell(table, formatPrix(prixUnit), normalFont);
                    addCell(table, formatPrix(montant), normalFont);
                }
            }

            doc.add(table);
            doc.add(Chunk.NEWLINE);

            // Totaux
            double total     = facture.getTotal() != null ? facture.getTotal().doubleValue() : 0;
            double pourboire = facture.getPourboire() != null ? facture.getPourboire().doubleValue() : 0;
            double totalTTC  = facture.getTotalTTC() != null ? facture.getTotalTTC().doubleValue() : total + pourboire;

            Paragraph totalPara = new Paragraph("TOTAL TTC : " + formatPrix(totalTTC), totalFont);
            totalPara.setAlignment(Element.ALIGN_RIGHT);
            doc.add(totalPara);

            if (pourboire > 0) {
                Paragraph pourboirePara = new Paragraph("dont pourboire : " + formatPrix(pourboire), mutedFont);
                pourboirePara.setAlignment(Element.ALIGN_RIGHT);
                doc.add(pourboirePara);
            }

            // Statut de règlement
            doc.add(Chunk.NEWLINE);
            String statutText = facture.isReglee() ? "Reglée" : "En attente de reglement";
            Color statutColor = facture.isReglee() ? new Color(16, 185, 129) : new Color(245, 158, 11);
            Font statutFont = new Font(Font.HELVETICA, 10, Font.BOLD, statutColor);
            doc.add(new Paragraph(statutText, statutFont));

            if (facture.isReglee() && facture.getDateReglement() != null) {
                doc.add(new Paragraph("Réglée le : " + facture.getDateReglement().format(DATE_FMT), mutedFont));
            }

            // Notes éventuelles
            if (facture.getNotes() != null && !facture.getNotes().isBlank()) {
                doc.add(Chunk.NEWLINE);
                doc.add(new Paragraph("Notes : " + facture.getNotes(), mutedFont));
            }

            // Pied de page
            doc.add(Chunk.NEWLINE);
            Paragraph footer = new Paragraph("OpenBar — Merci de votre visite", mutedFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Erreur génération PDF facture " + facture.getId(), e);
        }
    }

    private void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6);
        cell.setBorderColor(Color.GRAY);
        table.addCell(cell);
    }

    private String formatPrix(double prix) {
        return String.format("%.2f EUR", prix);
    }
}
