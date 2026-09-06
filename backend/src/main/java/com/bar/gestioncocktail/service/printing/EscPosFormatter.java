package com.bar.gestioncocktail.service.printing;

import com.bar.gestioncocktail.model.*;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Low-level ESC/POS binary command builder and document formatter for 80mm thermal printers.
 * Generates raw byte sequences compliant with the Epson ESC/POS standard.
 */
@Component
public class EscPosFormatter {

    /** Line width in characters for standard 80mm thermal paper (default 42 cols). */
    public static final int LINE_WIDTH = 42;

    /** Default fallback establishment name. */
    private static final String DEFAULT_APP_NAME = "OpenBar";

    /** Hardware printer initialization (ESC @). */
    protected static final byte[] CMD_INIT = new byte[] { 0x1B, 0x40 };

    /** Left text alignment (ESC a 0). */
    protected static final byte[] CMD_ALIGN_LEFT = new byte[] { 0x1B, 0x61, 0x00 };

    /** Centered text alignment (ESC a 1). */
    protected static final byte[] CMD_ALIGN_CENTER = new byte[] { 0x1B, 0x61, 0x01 };

    /** Right text alignment (ESC a 2). */
    protected static final byte[] CMD_ALIGN_RIGHT = new byte[] { 0x1B, 0x61, 0x02 };

    /** Bold font style ON (ESC E 1). */
    protected static final byte[] CMD_BOLD_ON = new byte[] { 0x1B, 0x45, 0x01 };

    /** Bold font style OFF (ESC E 0). */
    protected static final byte[] CMD_BOLD_OFF = new byte[] { 0x1B, 0x45, 0x00 };

    /** Double width and height ON (GS ! 0x11). */
    protected static final byte[] CMD_DOUBLE_SIZE_ON = new byte[] { 0x1D, 0x21, 0x11 };

    /** Double height font ON (GS ! 0x01). */
    protected static final byte[] CMD_DOUBLE_HEIGHT_ON = new byte[] { 0x1D, 0x21, 0x01 };

    /** Normal font size reset (GS ! 0x00). */
    protected static final byte[] CMD_DOUBLE_SIZE_OFF = new byte[] { 0x1D, 0x21, 0x00 };

    /** Full or partial paper cut (GS V 0). */
    protected static final byte[] CMD_CUT_PAPER = new byte[] { 0x1D, 0x56, 0x00 };

    /** Cash drawer pulse kick command on pin 2 (ESC p 0 25 250). */
    protected static final byte[] CMD_CASH_DRAWER = new byte[] { 0x1B, 0x70, 0x00, 0x19, (byte) 0xFA };

    /** Character code table selection: CP850 Multilingual (ESC t 2). */
    protected static final byte[] CMD_CODEPAGE_CP850 = new byte[] { 0x1B, 0x74, 0x02 };

    /** Line feed byte (LF / 0x0A). */
    protected static final byte LF = 0x0A;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Charset CP850 = Charset.forName("Cp850");

    /**
     * Formats a kitchen or bar preparation workstation order ticket.
     *
     * @param commande The source order
     * @param items Filtered order items routed to this station
     * @param station Preparation station (BAR, KITCHEN)
     * @param establishmentName Commercial establishment name
     * @return ESC/POS raw binary byte stream
     */
    public byte[] formatOrderTicket(Commande commande, List<CommandeItem> items, PreparationStation station, String establishmentName) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(CMD_INIT);
            out.write(CMD_CODEPAGE_CP850);

            appendOrderHeader(out, establishmentName, station);
            appendOrderMetadata(out, commande);
            appendOrderPriorityBanner(out, commande, items);
            int totalQty = appendOrderItems(out, items);
            appendOrderNotes(out, commande);
            appendOrderSummary(out, totalQty);

            feedAndCut(out, 4);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate ESC/POS order ticket byte stream", e);
        }
        return out.toByteArray();
    }

    private void appendOrderHeader(ByteArrayOutputStream out, String establishmentName, PreparationStation station) throws IOException {
        out.write(CMD_ALIGN_CENTER);
        out.write(CMD_BOLD_ON);
        out.write(CMD_DOUBLE_HEIGHT_ON);
        String brandName = (establishmentName != null && !establishmentName.isBlank()) ? establishmentName : DEFAULT_APP_NAME;
        writeText(out, brandName);
        out.write(LF);
        out.write(CMD_DOUBLE_SIZE_OFF);

        String stationTitle = (station == PreparationStation.KITCHEN || station == PreparationStation.SNACK)
                ? "BON DE CUISINE"
                : "BON DE BAR";
        writeText(out, stationTitle);
        out.write(LF);
        out.write(CMD_BOLD_OFF);
        out.write(CMD_ALIGN_LEFT);
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);
    }

    private void appendOrderMetadata(ByteArrayOutputStream out, Commande commande) throws IOException {
        String tableName = "Emporter / Comptoir";
        if (commande.getTable() != null) {
            tableName = "Table #" + commande.getTable().getNumero();
        }

        out.write(CMD_BOLD_ON);
        writeText(out, "TABLE : " + tableName);
        out.write(LF);
        out.write(CMD_BOLD_OFF);

        String orderIdStr = commande.getId() != null ? String.valueOf(commande.getId()) : "-";
        writeText(out, "Commande #" + orderIdStr);
        out.write(LF);

        LocalDateTime orderDate = commande.getDateCommande() != null ? commande.getDateCommande() : LocalDateTime.now(ZoneId.systemDefault());
        writeText(out, "Heure    : " + orderDate.format(DATE_FMT));
        out.write(LF);

        if (commande.getServeur() != null) {
            String srvName = resolveServerName(commande.getServeur());
            writeText(out, "Serveur  : " + srvName);
            out.write(LF);
        }
    }

    private String resolveServerName(User serveur) {
        if (serveur.getPrenom() != null) {
            String lastName = serveur.getNom() != null ? " " + serveur.getNom() : "";
            return (serveur.getPrenom() + lastName).trim();
        }
        return serveur.getUsername();
    }

    private void appendOrderPriorityBanner(ByteArrayOutputStream out, Commande commande, List<CommandeItem> items) throws IOException {
        boolean hasPriorityItem = false;
        if (items != null) {
            for (CommandeItem it : items) {
                if (it.isPrioritaire()) {
                    hasPriorityItem = true;
                    break;
                }
            }
        }
        if (commande.isPrioritaire() || hasPriorityItem) {
            out.write(CMD_ALIGN_CENTER);
            out.write(CMD_BOLD_ON);
            writeText(out, "*** COMMANDE PRIORITAIRE ***");
            out.write(LF);
            out.write(CMD_BOLD_OFF);
            out.write(CMD_ALIGN_LEFT);
        }
    }

    private int appendOrderItems(ByteArrayOutputStream out, List<CommandeItem> items) throws IOException {
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);

        int totalQty = 0;
        if (items == null) {
            return totalQty;
        }

        for (CommandeItem item : items) {
            totalQty += item.getQuantite();
            out.write(CMD_BOLD_ON);
            String cocktailName = item.getCocktail() != null ? item.getCocktail().getNom() : "Article";
            String itemLine = String.format("%2dx %s", item.getQuantite(), cocktailName);
            writeText(out, itemLine);
            out.write(LF);
            out.write(CMD_BOLD_OFF);

            if (item.getVariante() != null) {
                writeText(out, "    Variante: " + item.getVariante().getNom());
                out.write(LF);
            }
            if (item.getNotes() != null && !item.getNotes().isBlank()) {
                writeText(out, "    Note: " + item.getNotes().trim());
                out.write(LF);
            }
            if (item.isPrioritaire()) {
                writeText(out, "    [URGENT]");
                out.write(LF);
            }
        }
        return totalQty;
    }

    private void appendOrderNotes(ByteArrayOutputStream out, Commande commande) throws IOException {
        if (commande.getNotes() != null && !commande.getNotes().isBlank()) {
            writeText(out, repeat("-", LINE_WIDTH));
            out.write(LF);
            out.write(CMD_BOLD_ON);
            writeText(out, "Notes: " + commande.getNotes().trim());
            out.write(LF);
            out.write(CMD_BOLD_OFF);
        }
    }

    private void appendOrderSummary(ByteArrayOutputStream out, int totalQty) throws IOException {
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);
        writeText(out, formatTwoColumns("TOTAL ARTICLES:", String.valueOf(totalQty), LINE_WIDTH));
        out.write(LF);
    }

    /**
     * Formats a customer invoice/receipt ticket with pricing, VAT summary, and optional cash drawer kick.
     *
     * @param facture Customer invoice entity
     * @param legalConfig Establishment legal configuration
     * @param appSettings Application visual branding settings
     * @param openCashDrawer Whether to append a cash drawer kick pulse command
     * @return ESC/POS raw binary byte stream
     */
    public byte[] formatInvoiceReceipt(Facture facture, EstablishmentConfig legalConfig, AppSettings appSettings, boolean openCashDrawer) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(CMD_INIT);
            out.write(CMD_CODEPAGE_CP850);

            appendInvoiceHeader(out, legalConfig, appSettings);
            appendInvoiceMetadata(out, facture);

            String currencySymbol = (appSettings != null && appSettings.getCurrencySymbol() != null)
                    ? appSettings.getCurrencySymbol()
                    : "€";

            appendInvoiceItems(out, facture.getItems(), currencySymbol);
            appendInvoiceTotals(out, facture, currencySymbol);
            appendInvoiceFooter(out, facture);

            feedAndCut(out, 4);

            if (openCashDrawer) {
                out.write(CMD_CASH_DRAWER);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate ESC/POS invoice receipt byte stream", e);
        }
        return out.toByteArray();
    }

    private void appendInvoiceHeader(ByteArrayOutputStream out, EstablishmentConfig legalConfig, AppSettings appSettings) throws IOException {
        out.write(CMD_ALIGN_CENTER);
        out.write(CMD_BOLD_ON);
        out.write(CMD_DOUBLE_HEIGHT_ON);

        String tradeName = resolveTradeName(legalConfig, appSettings);
        writeText(out, tradeName);
        out.write(LF);
        out.write(CMD_DOUBLE_SIZE_OFF);
        out.write(CMD_BOLD_OFF);

        if (legalConfig != null) {
            writeLegalConfigDetails(out, legalConfig, tradeName);
        }

        out.write(CMD_BOLD_ON);
        writeText(out, "TICKET DE CAISSE");
        out.write(LF);
        out.write(CMD_BOLD_OFF);
    }

    private String resolveTradeName(EstablishmentConfig legalConfig, AppSettings appSettings) {
        if (appSettings != null && appSettings.getEstablishmentName() != null && !appSettings.getEstablishmentName().isBlank()) {
            return appSettings.getEstablishmentName();
        }
        if (legalConfig != null && legalConfig.getLegalName() != null && !legalConfig.getLegalName().isBlank()) {
            return legalConfig.getLegalName();
        }
        return DEFAULT_APP_NAME;
    }

    private void writeLegalConfigDetails(ByteArrayOutputStream out, EstablishmentConfig legalConfig, String tradeName) throws IOException {
        if (legalConfig.getLegalName() != null && !legalConfig.getLegalName().isBlank() && !legalConfig.getLegalName().equalsIgnoreCase(tradeName)) {
            writeText(out, legalConfig.getLegalName());
            out.write(LF);
        }
        if (legalConfig.getAddress() != null && !legalConfig.getAddress().isBlank()) {
            writeText(out, legalConfig.getAddress());
            out.write(LF);
        }
        if (legalConfig.getPhone() != null && !legalConfig.getPhone().isBlank()) {
            writeText(out, "Tel: " + legalConfig.getPhone());
            out.write(LF);
        }
        if (legalConfig.getSiret() != null && !legalConfig.getSiret().isBlank()) {
            writeText(out, "SIRET: " + legalConfig.getSiret());
            out.write(LF);
        }
        if (legalConfig.getTvaNumber() != null && !legalConfig.getTvaNumber().isBlank()) {
            writeText(out, "TVA: " + legalConfig.getTvaNumber());
            out.write(LF);
        }
    }

    private void appendInvoiceMetadata(ByteArrayOutputStream out, Facture facture) throws IOException {
        out.write(CMD_ALIGN_LEFT);
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);

        String ticketNumber = facture.getNumero() != null ? facture.getNumero() : String.valueOf(facture.getId());
        writeText(out, "Ticket N°: " + ticketNumber);
        out.write(LF);

        LocalDateTime dateFacture = facture.getDateFacture() != null ? facture.getDateFacture() : LocalDateTime.now(ZoneId.systemDefault());
        writeText(out, "Date     : " + dateFacture.format(DATE_FMT));
        out.write(LF);

        if (facture.getTable() != null) {
            writeText(out, "Table    : Table #" + facture.getTable().getNumero());
            out.write(LF);
        }
        if (facture.getModePaiement() != null && !facture.getModePaiement().isBlank()) {
            writeText(out, "Paiement : " + facture.getModePaiement());
            out.write(LF);
        }
    }

    private void appendInvoiceItems(ByteArrayOutputStream out, List<FactureItem> items, String currencySymbol) throws IOException {
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);
        writeText(out, formatThreeColumns("QTE", "ARTICLE", "TOTAL", 4, 28, 10));
        out.write(LF);
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);

        if (items != null) {
            for (FactureItem item : items) {
                String totalStr = formatAmount(item.getTotal(), currencySymbol);
                String desc = item.getDescription() != null ? item.getDescription() : "Article";
                writeText(out, formatThreeColumns(
                        String.valueOf(item.getQuantite()),
                        desc,
                        totalStr,
                        4, 28, 10
                ));
                out.write(LF);
            }
        }
    }

    private void appendInvoiceTotals(ByteArrayOutputStream out, Facture facture, String currencySymbol) throws IOException {
        writeText(out, repeat("-", LINE_WIDTH));
        out.write(LF);

        BigDecimal totalHT = facture.getTotalHT() != null ? facture.getTotalHT() : BigDecimal.ZERO;
        BigDecimal totalVAT = facture.getTotalVAT() != null ? facture.getTotalVAT() : BigDecimal.ZERO;
        BigDecimal totalTTC = resolveTotalTtc(facture);

        writeText(out, formatTwoColumns("Total HT:", formatAmount(totalHT, currencySymbol), LINE_WIDTH));
        out.write(LF);
        writeText(out, formatTwoColumns("TVA:", formatAmount(totalVAT, currencySymbol), LINE_WIDTH));
        out.write(LF);

        out.write(CMD_BOLD_ON);
        writeText(out, formatTwoColumns("TOTAL TTC:", formatAmount(totalTTC, currencySymbol), LINE_WIDTH));
        out.write(LF);
        out.write(CMD_BOLD_OFF);

        if (facture.getPourboire() != null && facture.getPourboire().compareTo(BigDecimal.ZERO) > 0) {
            writeText(out, formatTwoColumns("Pourboire:", formatAmount(facture.getPourboire(), currencySymbol), LINE_WIDTH));
            out.write(LF);
        }
    }

    private BigDecimal resolveTotalTtc(Facture facture) {
        if (facture.getTotalTTC() != null) {
            return facture.getTotalTTC();
        }
        if (facture.getTotal() != null) {
            return facture.getTotal();
        }
        return BigDecimal.ZERO;
    }

    private void appendInvoiceFooter(ByteArrayOutputStream out, Facture facture) throws IOException {
        out.write(CMD_ALIGN_CENTER);
        if (facture.isReglee()) {
            out.write(CMD_BOLD_ON);
            writeText(out, "*** REGLE - MERCI DE VOTRE VISITE ***");
            out.write(LF);
            out.write(CMD_BOLD_OFF);
        } else {
            writeText(out, "Merci de votre visite !");
            out.write(LF);
        }
    }

    /**
     * Formats a connectivity and alignment diagnostic test ticket.
     *
     * @param role Printer role (BAR, KITCHEN, CASH_DESK)
     * @param establishmentName Commercial name
     * @param ip Target LAN IP address
     * @param port Target TCP port
     * @return ESC/POS raw binary byte stream
     */
    public byte[] formatTestTicket(PrinterRole role, String establishmentName, String ip, int port) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(CMD_INIT);
            out.write(CMD_CODEPAGE_CP850);

            // Header
            out.write(CMD_ALIGN_CENTER);
            out.write(CMD_BOLD_ON);
            out.write(CMD_DOUBLE_HEIGHT_ON);
            String brandName = (establishmentName != null && !establishmentName.isBlank()) ? establishmentName : DEFAULT_APP_NAME;
            writeText(out, brandName);
            out.write(LF);
            out.write(CMD_DOUBLE_SIZE_OFF);

            writeText(out, "TEST IMPRESSION ESC/POS");
            out.write(LF);
            out.write(CMD_BOLD_OFF);

            out.write(CMD_ALIGN_LEFT);
            writeText(out, repeat("=", LINE_WIDTH));
            out.write(LF);

            writeText(out, "Role Imprimante : " + (role != null ? role.name() : "N/A"));
            out.write(LF);
            writeText(out, "Adresse Cible   : " + ip + ":" + port);
            out.write(LF);
            writeText(out, "Date & Heure    : " + LocalDateTime.now(ZoneId.systemDefault()).format(DATE_FMT));
            out.write(LF);

            writeText(out, repeat("-", LINE_WIDTH));
            out.write(LF);

            writeText(out, "Test typographique :");
            out.write(LF);
            writeText(out, " [x] Texte normal 42 colonnes");
            out.write(LF);

            out.write(CMD_BOLD_ON);
            writeText(out, " [x] Texte gras active");
            out.write(LF);
            out.write(CMD_BOLD_OFF);

            out.write(CMD_ALIGN_CENTER);
            writeText(out, "[x] Texte centre");
            out.write(LF);

            out.write(CMD_ALIGN_RIGHT);
            writeText(out, "[x] Texte aligne a droite");
            out.write(LF);

            out.write(CMD_ALIGN_LEFT);
            writeText(out, repeat("=", LINE_WIDTH));
            out.write(LF);

            out.write(CMD_ALIGN_CENTER);
            out.write(CMD_BOLD_ON);
            writeText(out, "*** CONNEXION RESEAU 9100 OK ***");
            out.write(LF);
            out.write(CMD_BOLD_OFF);

            feedAndCut(out, 4);

            if (role == PrinterRole.CASH_DESK) {
                out.write(CMD_CASH_DRAWER);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate ESC/POS test ticket byte stream", e);
        }
        return out.toByteArray();
    }

    /**
     * Generates a cash drawer kick pulse sequence.
     *
     * @return ESC/POS raw binary byte stream
     */
    public byte[] formatCashDrawerKick() {
        return CMD_CASH_DRAWER.clone();
    }

    private void feedAndCut(ByteArrayOutputStream out, int feedLines) throws IOException {
        for (int i = 0; i < feedLines; i++) {
            out.write(LF);
        }
        out.write(CMD_CUT_PAPER);
    }

    private void writeText(ByteArrayOutputStream out, String text) throws IOException {
        if (text == null) {
            return;
        }
        byte[] bytes = text.getBytes(CP850);
        out.write(bytes);
    }

    /**
     * Formats two strings aligned on opposite ends of a fixed line width.
     *
     * @param left Left-aligned text
     * @param right Right-aligned text
     * @param width Total line width in characters
     * @return Formatted line
     */
    public String formatTwoColumns(String left, String right, int width) {
        String l = left != null ? left : "";
        String r = right != null ? right : "";
        int spacesNeeded = width - l.length() - r.length();
        if (spacesNeeded <= 0) {
            return l + " " + r;
        }
        return l + repeat(" ", spacesNeeded) + r;
    }

    /**
     * Formats three columns with dedicated column widths.
     *
     * @param col1 First column (left-aligned)
     * @param col2 Second column (left-aligned)
     * @param col3 Third column (right-aligned)
     * @param w1 Width of column 1
     * @param w2 Width of column 2
     * @param w3 Width of column 3
     * @return Formatted line
     */
    public String formatThreeColumns(String col1, String col2, String col3, int w1, int w2, int w3) {
        String c1 = col1 != null ? col1 : "";
        String c2 = col2 != null ? col2 : "";
        String c3 = col3 != null ? col3 : "";

        if (c1.length() > w1) {
            c1 = c1.substring(0, w1);
        } else {
            c1 = c1 + repeat(" ", w1 - c1.length());
        }

        if (c2.length() > w2) {
            c2 = c2.substring(0, w2);
        } else {
            c2 = c2 + repeat(" ", w2 - c2.length());
        }

        if (c3.length() > w3) {
            c3 = c3.substring(0, w3);
        } else {
            c3 = repeat(" ", w3 - c3.length()) + c3;
        }

        return c1 + c2 + c3;
    }

    private String formatAmount(BigDecimal amount, String currencySymbol) {
        BigDecimal val = amount != null ? amount : BigDecimal.ZERO;
        return String.format("%.2f %s", val, currencySymbol);
    }

    private String repeat(String s, int count) {
        return count > 0 ? s.repeat(count) : "";
    }
}
