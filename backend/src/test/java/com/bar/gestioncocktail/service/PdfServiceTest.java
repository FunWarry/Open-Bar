package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

/**
 * Tests unitaires pour PdfService.
 *
 * PdfService n'a pas de dépendance injectée : il utilise OpenPDF directement.
 * On l'instancie simplement avec @InjectMocks (ou new PdfService()) et on
 * vérifie que generateFacturePdf() retourne un byte[] non vide (PDF valide).
 */
@ExtendWith(MockitoExtension.class)
class PdfServiceTest {

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @InjectMocks
    private PdfService pdfService;

    private Facture factureComplete;
    private TableEntity table;

    @BeforeEach
    void setUp() {
        EstablishmentConfig config = new EstablishmentConfig();
        config.setLegalName("OpenBar SARL");
        config.setSiret("12345678900010");
        lenient().when(establishmentConfigService.getConfig()).thenReturn(config);

        table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);

        FactureItem item1 = new FactureItem();
        item1.setId(1L);
        item1.setDescription("Mojito");
        item1.setQuantite(2);
        item1.setPrixUnitaire(new BigDecimal("8.50"));
        item1.setTotal(new BigDecimal("17.00"));

        FactureItem item2 = new FactureItem();
        item2.setId(2L);
        item2.setDescription("Daiquiri Fraise");
        item2.setQuantite(1);
        item2.setPrixUnitaire(new BigDecimal("9.00"));
        item2.setTotal(new BigDecimal("9.00"));

        factureComplete = new Facture();
        factureComplete.setId(1L);
        factureComplete.setNumero("FAC-2024-001");
        factureComplete.setDateFacture(LocalDateTime.of(2024, 6, 15, 20, 30));
        factureComplete.setTable(table);
        factureComplete.setModePaiement("CARTE");
        factureComplete.setTotal(new BigDecimal("26.00"));
        factureComplete.setPourboire(new BigDecimal("2.00"));
        factureComplete.setTotalTTC(new BigDecimal("28.00"));
        factureComplete.setReglee(true);
        factureComplete.setDateReglement(LocalDateTime.of(2024, 6, 15, 21, 0));
        factureComplete.setNotes("Client fidèle — offrir un digestif");
        factureComplete.setItems(List.of(item1, item2));
    }

    // ─── cas nominal ──────────────────────────────────────────────────────────

    @Test
    void generateFacturePdf_factureComplete_retourneByteArrayNonVide() {
        byte[] pdf = pdfService.generateFacturePdf(factureComplete);

        assertThat(pdf).isNotNull();
        assertThat(pdf.length).isGreaterThan(0);
    }

    @Test
    void generateFacturePdf_factureComplete_retournePdfValide() {
        // Un PDF valide commence toujours par la signature %PDF-
        byte[] pdf = pdfService.generateFacturePdf(factureComplete);

        String header = new String(pdf, 0, Math.min(5, pdf.length));
        assertThat(header).startsWith("%PDF");
    }

    @Test
    void generateFacturePdf_factureComplete_tailleSuffisante() {
        // Un PDF contenant du texte et un tableau doit dépasser 1 Ko
        byte[] pdf = pdfService.generateFacturePdf(factureComplete);

        assertThat(pdf.length).isGreaterThan(1_000);
    }

    // ─── champs optionnels null ────────────────────────────────────────────────

    @Test
    void generateFacturePdf_sansTable_neLeveAucuneException() {
        Facture factureSansTable = new Facture();
        factureSansTable.setId(2L);
        factureSansTable.setNumero("FAC-2024-002");
        factureSansTable.setTable(null);
        factureSansTable.setTotal(new BigDecimal("10.00"));
        factureSansTable.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureSansTable);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_sansDateFacture_neLeveAucuneException() {
        Facture factureSansDate = new Facture();
        factureSansDate.setId(3L);
        factureSansDate.setNumero("FAC-2024-003");
        factureSansDate.setDateFacture(null);
        factureSansDate.setTotal(new BigDecimal("5.00"));
        factureSansDate.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureSansDate);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_sansModePaiement_neLeveAucuneException() {
        Facture factureSansPaiement = new Facture();
        factureSansPaiement.setId(4L);
        factureSansPaiement.setNumero("FAC-2024-004");
        factureSansPaiement.setModePaiement(null);
        factureSansPaiement.setTotal(new BigDecimal("15.00"));
        factureSansPaiement.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureSansPaiement);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_sansPourboire_neLeveAucuneException() {
        Facture factureSansPourboire = new Facture();
        factureSansPourboire.setId(5L);
        factureSansPourboire.setNumero("FAC-2024-005");
        factureSansPourboire.setTotal(new BigDecimal("20.00"));
        factureSansPourboire.setPourboire(null);
        factureSansPourboire.setTotalTTC(null);
        factureSansPourboire.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureSansPourboire);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_sansTotalTTC_calculeTotalPlusPourboire() {
        // totalTTC null → le service doit calculer total + pourboire sans NPE
        Facture facture = new Facture();
        facture.setId(6L);
        facture.setNumero("FAC-2024-006");
        facture.setTotal(new BigDecimal("18.00"));
        facture.setPourboire(new BigDecimal("2.00"));
        facture.setTotalTTC(null); // doit être calculé en interne
        facture.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(facture);

        assertThat(pdf).isNotEmpty();
    }

    // ─── liste items ───────────────────────────────────────────────────────────

    @Test
    void generateFacturePdf_itemsNull_neLeveAucuneException() {
        Facture factureItemsNull = new Facture();
        factureItemsNull.setId(7L);
        factureItemsNull.setNumero("FAC-2024-007");
        factureItemsNull.setTotal(BigDecimal.ZERO);
        factureItemsNull.setItems(null);

        byte[] pdf = pdfService.generateFacturePdf(factureItemsNull);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_itemsVide_retournePdfValide() {
        Facture factureVide = new Facture();
        factureVide.setId(8L);
        factureVide.setNumero("FAC-2024-008");
        factureVide.setTotal(BigDecimal.ZERO);
        factureVide.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureVide);

        String header = new String(pdf, 0, Math.min(5, pdf.length));
        assertThat(header).startsWith("%PDF");
    }

    @Test
    void generateFacturePdf_itemAvecPrixUnitaireNull_neLeveAucuneException() {
        FactureItem itemSansPrix = new FactureItem();
        itemSansPrix.setId(10L);
        itemSansPrix.setDescription("Eau pétillante");
        itemSansPrix.setQuantite(1);
        itemSansPrix.setPrixUnitaire(null);  // prix null → doit valoir 0
        itemSansPrix.setTotal(new BigDecimal("2.00"));

        Facture facture = new Facture();
        facture.setId(9L);
        facture.setNumero("FAC-2024-009");
        facture.setTotal(new BigDecimal("2.00"));
        facture.setItems(List.of(itemSansPrix));

        byte[] pdf = pdfService.generateFacturePdf(facture);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_itemAvecTotalNull_calculeQuantiteFoisPrix() {
        FactureItem itemSansTotal = new FactureItem();
        itemSansTotal.setId(11L);
        itemSansTotal.setDescription("Bière pression");
        itemSansTotal.setQuantite(3);
        itemSansTotal.setPrixUnitaire(new BigDecimal("4.50"));
        itemSansTotal.setTotal(null); // total null → calculé via quantite × prixUnitaire

        Facture facture = new Facture();
        facture.setId(10L);
        facture.setNumero("FAC-2024-010");
        facture.setTotal(new BigDecimal("13.50"));
        facture.setItems(List.of(itemSansTotal));

        byte[] pdf = pdfService.generateFacturePdf(facture);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_itemAvecDescriptionNull_neLeveAucuneException() {
        FactureItem itemSansDesc = new FactureItem();
        itemSansDesc.setId(12L);
        itemSansDesc.setDescription(null);
        itemSansDesc.setQuantite(1);
        itemSansDesc.setPrixUnitaire(new BigDecimal("5.00"));
        itemSansDesc.setTotal(new BigDecimal("5.00"));

        Facture facture = new Facture();
        facture.setId(11L);
        facture.setNumero("FAC-2024-011");
        facture.setTotal(new BigDecimal("5.00"));
        facture.setItems(List.of(itemSansDesc));

        byte[] pdf = pdfService.generateFacturePdf(facture);

        assertThat(pdf).isNotEmpty();
    }

    // ─── statut règlement ──────────────────────────────────────────────────────

    @Test
    void generateFacturePdf_factureNonReglee_retournePdfValide() {
        Facture factureNonReglee = new Facture();
        factureNonReglee.setId(12L);
        factureNonReglee.setNumero("FAC-2024-012");
        factureNonReglee.setReglee(false);
        factureNonReglee.setDateReglement(null);
        factureNonReglee.setTotal(new BigDecimal("30.00"));
        factureNonReglee.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureNonReglee);

        assertThat(pdf).isNotEmpty();
        String header = new String(pdf, 0, Math.min(5, pdf.length));
        assertThat(header).startsWith("%PDF");
    }

    @Test
    void generateFacturePdf_factureRegleeAvecDateReglement_retournePdfValide() {
        Facture factureReglee = new Facture();
        factureReglee.setId(13L);
        factureReglee.setNumero("FAC-2024-013");
        factureReglee.setReglee(true);
        factureReglee.setDateReglement(LocalDateTime.of(2024, 6, 20, 22, 15));
        factureReglee.setTotal(new BigDecimal("45.00"));
        factureReglee.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureReglee);

        assertThat(pdf).isNotEmpty();
    }

    // ─── notes ────────────────────────────────────────────────────────────────

    @Test
    void generateFacturePdf_avecNotes_retournePdfValide() {
        Facture factureAvecNotes = new Facture();
        factureAvecNotes.setId(14L);
        factureAvecNotes.setNumero("FAC-2024-014");
        factureAvecNotes.setNotes("Anniversaire — décoration spéciale");
        factureAvecNotes.setTotal(new BigDecimal("60.00"));
        factureAvecNotes.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureAvecNotes);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    void generateFacturePdf_notesVides_neLeveAucuneException() {
        Facture factureNotesVides = new Facture();
        factureNotesVides.setId(15L);
        factureNotesVides.setNumero("FAC-2024-015");
        factureNotesVides.setNotes("   "); // blank — ne doit pas être affiché
        factureNotesVides.setTotal(new BigDecimal("12.00"));
        factureNotesVides.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureNotesVides);

        assertThat(pdf).isNotEmpty();
    }

    // ─── pourboire affiché uniquement si > 0 ──────────────────────────────────

    @Test
    void generateFacturePdf_pourboireZero_retournePdfValide() {
        Facture factureSansPourboire = new Facture();
        factureSansPourboire.setId(16L);
        factureSansPourboire.setNumero("FAC-2024-016");
        factureSansPourboire.setTotal(new BigDecimal("25.00"));
        factureSansPourboire.setPourboire(BigDecimal.ZERO);
        factureSansPourboire.setTotalTTC(new BigDecimal("25.00"));
        factureSansPourboire.setItems(new ArrayList<>());

        byte[] pdf = pdfService.generateFacturePdf(factureSansPourboire);

        assertThat(pdf).isNotEmpty();
    }

    // ─── items multiples ──────────────────────────────────────────────────────

    @Test
    void generateFacturePdf_multiplesItems_retournePdfNonVide() {
        List<FactureItem> items = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            FactureItem fi = new FactureItem();
            fi.setId((long) i);
            fi.setDescription("Cocktail " + i);
            fi.setQuantite(i);
            fi.setPrixUnitaire(new BigDecimal("7.00"));
            fi.setTotal(new BigDecimal("7.00").multiply(BigDecimal.valueOf(i)));
            items.add(fi);
        }

        Facture factureMulti = new Facture();
        factureMulti.setId(17L);
        factureMulti.setNumero("FAC-2024-017");
        factureMulti.setTotal(new BigDecimal("385.00"));
        factureMulti.setItems(items);

        byte[] pdf = pdfService.generateFacturePdf(factureMulti);

        assertThat(pdf).isNotEmpty();
        assertThat(pdf.length).isGreaterThan(1_000);
    }
}
