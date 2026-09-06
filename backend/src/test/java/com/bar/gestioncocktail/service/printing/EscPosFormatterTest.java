package com.bar.gestioncocktail.service.printing;

import com.bar.gestioncocktail.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EscPosFormatterTest {

    private EscPosFormatter formatter;
    private static final Charset CP850 = Charset.forName("Cp850");

    @BeforeEach
    void setUp() {
        formatter = new EscPosFormatter();
    }

    @Test
    @DisplayName("formatOrderTicket generates valid byte stream with table number, items, and urgent notes")
    void formatOrderTicket_withValidData_generatesExpectedBytes() {
        Commande commande = new Commande();
        commande.setId(42L);
        commande.setDateCommande(LocalDateTime.of(2026, 9, 6, 20, 15));
        commande.setNotes("Sans paille svp");

        TableEntity table = new TableEntity();
        table.setNumero(7);
        commande.setTable(table);

        User serveur = new User();
        serveur.setUsername("john");
        serveur.setPrenom("John");
        serveur.setNom("Doe");
        commande.setServeur(serveur);

        Cocktail mojito = new Cocktail();
        mojito.setNom("Mojito");
        CommandeItem item1 = new CommandeItem();
        item1.setCocktail(mojito);
        item1.setQuantite(2);
        item1.setPrioritaire(true);

        CocktailVariante variante = new CocktailVariante();
        variante.setNom("Sans Alcool");
        item1.setVariante(variante);
        item1.setNotes("Menthe fraîche");

        List<CommandeItem> items = List.of(item1);

        byte[] output = formatter.formatOrderTicket(commande, items, PreparationStation.BAR, "Mon Super Bar");

        assertThat(output).isNotEmpty();
        String text = new String(output, CP850);
        assertThat(text).contains(
                "Mon Super Bar",
                "BON DE BAR",
                "TABLE : Table #7",
                "Commande #42",
                "Serveur  : John Doe",
                "*** COMMANDE PRIORITAIRE ***",
                "2x Mojito",
                "Variante: Sans Alcool",
                "Note: Menthe fraîche",
                "[URGENT]",
                "Notes: Sans paille svp",
                "TOTAL ARTICLES:"
        );
    }

    @Test
    @DisplayName("formatOrderTicket handles kitchen station and null table safely")
    void formatOrderTicket_kitchenWithoutTable_generatesCorrectOutput() {
        Commande commande = new Commande();
        commande.setId(99L);
        commande.setTable(null);

        Cocktail burger = new Cocktail();
        burger.setNom("Burger Maison");
        CommandeItem item1 = new CommandeItem();
        item1.setCocktail(burger);
        item1.setQuantite(1);

        byte[] output = formatter.formatOrderTicket(commande, List.of(item1), PreparationStation.KITCHEN, null);

        assertThat(output).isNotEmpty();
        String text = new String(output, CP850);
        assertThat(text).contains(
                "OpenBar",
                "BON DE CUISINE",
                "TABLE : Emporter / Comptoir",
                "1x Burger Maison"
        );
    }

    @Test
    @DisplayName("formatInvoiceReceipt generates compliant thermal receipt with legal info, items, and totals")
    void formatInvoiceReceipt_withLegalConfig_generatesCompliantReceipt() {
        Facture facture = new Facture();
        facture.setId(101L);
        facture.setNumero("FAC-2026-001");
        facture.setDateFacture(LocalDateTime.of(2026, 9, 6, 21, 30));
        facture.setModePaiement("CB");
        facture.setTotalHT(new BigDecimal("20.00"));
        facture.setTotalVAT(new BigDecimal("4.00"));
        facture.setTotalTTC(new BigDecimal("24.00"));
        facture.setPourboire(new BigDecimal("2.00"));
        facture.setReglee(true);

        TableEntity table = new TableEntity();
        table.setNumero(3);
        facture.setTable(table);

        FactureItem item = new FactureItem();
        item.setDescription("Cocktail Signature");
        item.setQuantite(2);
        item.setPrixUnitaire(new BigDecimal("12.00"));
        item.setTotal(new BigDecimal("24.00"));
        facture.setItems(List.of(item));

        EstablishmentConfig legalConfig = new EstablishmentConfig();
        legalConfig.setLegalName("Bar SAS");
        legalConfig.setSiret("12345678901234");
        legalConfig.setTvaNumber("FR99123456789");
        legalConfig.setAddress("10 Rue de Paris");
        legalConfig.setPhone("0102030405");

        AppSettings settings = new AppSettings();
        settings.setEstablishmentName("Le Rooftop");
        settings.setCurrencySymbol("€");

        byte[] output = formatter.formatInvoiceReceipt(facture, legalConfig, settings, true);

        assertThat(output).isNotEmpty();
        String text = new String(output, CP850);
        assertThat(text).contains(
                "Le Rooftop",
                "Bar SAS",
                "10 Rue de Paris",
                "SIRET: 12345678901234",
                "TVA: FR99123456789",
                "TICKET DE CAISSE",
                "Ticket N°: FAC-2026-001",
                "Table    : Table #3",
                "Paiement : CB",
                "Cocktail Signature",
                "Total HT:",
                "TOTAL TTC:",
                "Pourboire:",
                "*** REGLE - MERCI DE VOTRE VISITE ***"
        );

        // Last 5 bytes should be cash drawer pulse command
        byte[] kick = formatter.formatCashDrawerKick();
        byte[] tail = new byte[kick.length];
        System.arraycopy(output, output.length - kick.length, tail, 0, kick.length);
        assertThat(tail).isEqualTo(kick);
    }

    @Test
    @DisplayName("formatTestTicket produces test ticket with role, IP and port")
    void formatTestTicket_generatesDiagnosticTicket() {
        byte[] output = formatter.formatTestTicket(PrinterRole.BAR, "My Bar", "192.168.1.100", 9100);

        assertThat(output).isNotEmpty();
        String text = new String(output, CP850);
        assertThat(text).contains(
                "My Bar",
                "TEST IMPRESSION ESC/POS",
                "Role Imprimante : BAR",
                "Adresse Cible   : 192.168.1.100:9100",
                "*** CONNEXION RESEAU 9100 OK ***"
        );
    }

    @Test
    @DisplayName("formatTwoColumns formats text with proper column spacing")
    void formatTwoColumns_alignsTextProperly() {
        String line = formatter.formatTwoColumns("TOTAL:", "15.00 €", 20);
        assertThat(line)
                .hasSize(20)
                .startsWith("TOTAL:")
                .endsWith("15.00 €");
    }

    @Test
    @DisplayName("formatThreeColumns respects designated column widths")
    void formatThreeColumns_formatsExpectedWidths() {
        String line = formatter.formatThreeColumns("2x", "Mojito", "16.00 €", 4, 10, 8);
        assertThat(line)
                .hasSize(22)
                .startsWith("2x  ")
                .endsWith(" 16.00 €");
    }

    @Test
    @DisplayName("formatZReportTicket with complete data produces valid ESC/POS Z-report stream")
    void formatZReportTicket_withCompleteData_generatesAllSectionsAndSeal() {
        DailyCashClosure closure = new DailyCashClosure();
        closure.setClosureNumber("Z-2026-00001");
        closure.setClosureDate(java.time.LocalDate.of(2026, 9, 6));
        closure.setCreatedAt(LocalDateTime.of(2026, 9, 6, 23, 45, 0));

        User operator = new User();
        operator.setUsername("alice");
        closure.setClosedBy(operator);

        closure.setOpeningFloat(new BigDecimal("150.00"));
        closure.setTheoreticalCash(new BigDecimal("450.00"));
        closure.setCountedCash(new BigDecimal("445.00"));
        closure.setCashDiscrepancy(new BigDecimal("-5.00"));
        closure.setDiscrepancyReason("Erreur rendu monnaie 5 EUR");
        closure.setTotalRevenueHT(new BigDecimal("500.00"));
        closure.setTotalRevenueTTC(new BigDecimal("600.00"));

        closure.setPaymentMethodsJson("[{\"modePaiement\":\"ESPECES\",\"count\":15,\"totalTtc\":300.00},{\"modePaiement\":\"CARTE\",\"count\":12,\"totalTtc\":300.00}]");
        closure.setVatBreakdownJson("[{\"tauxLabel\":\"20.0%\",\"baseHt\":500.00,\"montantTva\":100.00,\"totalTtc\":600.00}]");
        closure.setSha256Hash("a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef");

        EstablishmentConfig legalConfig = new EstablishmentConfig();
        legalConfig.setLegalName("Le Comptoir Moderne");
        legalConfig.setSiret("12345678901234");

        AppSettings appSettings = new AppSettings();
        appSettings.setCurrencySymbol("€");
        appSettings.setEstablishmentName("Le Comptoir Moderne");

        byte[] output = formatter.formatZReportTicket(closure, legalConfig, appSettings);

        assertThat(output).isNotEmpty();
        String text = new String(output, CP850);
        assertThat(text).contains(
                "Le Comptoir Moderne",
                "SIRET: 12345678901234",
                "TICKET Z",
                "CLOTURE DE CAISSE DU 06/09/2026",
                "N° Clôture : Z-2026-00001",
                "Opérateur  : alice",
                "CHIFFRE D'AFFAIRES",
                "CA TOTAL TTC",
                "CA TOTAL HT",
                "TOTAL TVA",
                "RECONCILIATION TIROIR CAISSE",
                "Fond initial",
                "Espèces attendues",
                "Espèces comptées",
                "ECART DE CAISSE",
                "Motif : Erreur rendu monnaie 5 EUR",
                "VENTILATION PAIEMENTS",
                "ESPECES (15)",
                "CARTE (12)",
                "VENTILATION TVA",
                "20.0%",
                "SCEAU NUMERIQUE DE SECURITE",
                "a1b2c3d4e5f60718293a4b5c6d7e8f90",
                "1234567890abcdef1234567890abcdef",
                "Inalterabilite certifiee - CGI art. 286"
        );
    }

    @Test
    @DisplayName("formatZReportTicket handles null fields and fallback defaults gracefully")
    void formatZReportTicket_withMinimalDataAndNullFields_formatsGracefully() {
        DailyCashClosure closure = new DailyCashClosure();
        closure.setClosureNumber("Z-2026-00002");
        closure.setClosureDate(java.time.LocalDate.of(2026, 9, 6));
        closure.setCreatedAt(null);
        closure.setClosedBy(null);
        closure.setOpeningFloat(BigDecimal.ZERO);
        closure.setTheoreticalCash(BigDecimal.ZERO);
        closure.setCountedCash(BigDecimal.ZERO);
        closure.setCashDiscrepancy(BigDecimal.ZERO);
        closure.setTotalRevenueHT(BigDecimal.ZERO);
        closure.setTotalRevenueTTC(BigDecimal.ZERO);
        closure.setDiscrepancyReason(null);
        closure.setPaymentMethodsJson(null);
        closure.setVatBreakdownJson(null);
        closure.setSha256Hash("short-hash");

        byte[] output = formatter.formatZReportTicket(closure, null, null);

        assertThat(output).isNotEmpty();
        String text = new String(output, CP850);
        assertThat(text).contains(
                "TICKET Z",
                "CLOTURE DE CAISSE DU 06/09/2026",
                "N° Clôture : Z-2026-00002",
                "Date/Heure : N/A",
                "Opérateur  : SYSTEM",
                "CHIFFRE D'AFFAIRES",
                "RECONCILIATION TIROIR CAISSE",
                "SCEAU NUMERIQUE DE SECURITE",
                "short-hash",
                "Inalterabilite certifiee - CGI art. 286"
        );
    }
}
