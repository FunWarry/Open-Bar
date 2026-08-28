package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.dto.MergeFacturesRequestDTO;
import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitPartRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.FactureItemRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.mockito.Spy;
import com.bar.gestioncocktail.dto.EncaissementRequestDTO;
import com.bar.gestioncocktail.dto.TableAdditionResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class FactureServiceTest {

    @Mock
    FactureRepository factureRepository;

    @Mock
    TableRepository tableRepository;

    @Mock
    CommandeRepository commandeRepository;

    @Mock
    NotificationService notificationService;

    @Mock
    UserRepository userRepository;

    @Mock
    FactureItemRepository factureItemRepository;

    @Mock
    EntityManager entityManager;

    @Mock
    AuditLogService auditLogService;

    @Mock
    com.bar.gestioncocktail.repository.FactureReglementRepository factureReglementRepository;

    @Mock
    com.bar.gestioncocktail.repository.AvoirCreditRepository avoirCreditRepository;

    @Spy
    TimeService timeService = new TimeService(null);

    @InjectMocks
    FactureService factureService;


    private Facture facture;
    private FactureItem item1;
    private FactureItem item2;

    @BeforeEach
    void setUp() {
        item1 = new FactureItem();
        item1.setId(1L);
        item1.setDescription("Mojito");
        item1.setQuantite(2);
        item1.setPrixUnitaire(new BigDecimal("8.00"));
        item1.setTotal(new BigDecimal("16.00"));

        item2 = new FactureItem();
        item2.setId(2L);
        item2.setDescription("Pina Colada");
        item2.setQuantite(1);
        item2.setPrixUnitaire(new BigDecimal("9.00"));
        item2.setTotal(new BigDecimal("9.00"));

        facture = new Facture();
        facture.setId(10L);
        facture.setTotal(new BigDecimal("25.00"));
        facture.setTotalTTC(new BigDecimal("25.00"));
        List<FactureItem> items = new ArrayList<>();
        items.add(item1);
        items.add(item2);
        facture.setItems(items);
    }

    @Test
    void createFacture_genereNumeroFormate() {
        // Arrange
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture newFacture = new Facture();
        newFacture.setTotal(BigDecimal.TEN);
        newFacture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(newFacture);

        // Assert
        assertThat(result.getNumero()).isNotNull();
        int year = LocalDateTime.now().getYear();
        assertThat(result.getNumero()).isEqualTo("FAC-" + year + "-00001");
    }

    @Test
    void createFacture_numeroIncrementeAvecSequence() {
        // Arrange
        when(factureRepository.count()).thenReturn(41L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture newFacture = new Facture();
        newFacture.setTotal(BigDecimal.TEN);
        newFacture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(newFacture);

        // Assert
        int year = LocalDateTime.now().getYear();
        assertThat(result.getNumero()).isEqualTo("FAC-" + year + "-00042");
    }

    @Test
    void createFacture_setDateFacture() {
        // Arrange
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture newFacture = new Facture();
        newFacture.setTotal(BigDecimal.TEN);
        newFacture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(newFacture);

        // Assert
        assertThat(result.getDateFacture()).isNotNull();
        assertThat(result.getDateFacture()).isBeforeOrEqualTo(LocalDateTime.now());
    }

    // ─── splitEgal ────────────────────────────────────────────────────────────

    @Test
    void splitEqual_twoGuests_returnsTwoEqualParts() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 2);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).sousTotal()).isEqualByComparingTo(new BigDecimal("12.50"));
        assertThat(result.get(1).sousTotal()).isEqualByComparingTo(new BigDecimal("12.50"));
        assertThat(result.get(0).nomConvive()).isEqualTo("Guest 1");
        assertThat(result.get(1).nomConvive()).isEqualTo("Guest 2");
    }

    @Test
    void splitEqual_threeGuests_roundsHalfUp() {
        // total 25.00 / 3 = 8.33 (arrondi HALF_UP)
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 3);

        assertThat(result).hasSize(3);
        result.forEach(part ->
            assertThat(part.sousTotal()).isEqualByComparingTo(new BigDecimal("8.33"))
        );
    }

    @Test
    void splitEqual_usesTotalTTCWhenAvailable() {
        // totalTTC takes precedence over total
        facture.setTotal(new BigDecimal("20.00"));
        facture.setTotalTTC(new BigDecimal("24.00")); // avec pourboire
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 2);

        assertThat(result.get(0).sousTotal()).isEqualByComparingTo(new BigDecimal("12.00"));
    }

    @Test
    void splitEqual_withoutTotal_usesZero() {
        facture.setTotal(null);
        facture.setTotalTTC(null);
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 2);

        assertThat(result).hasSize(2);
        result.forEach(part ->
            assertThat(part.sousTotal()).isEqualByComparingTo(BigDecimal.ZERO)
        );
    }

    @Test
    void splitEqual_oneGuest_throwsBusinessException() {
        assertThatThrownBy(() -> factureService.splitEgal(10L, 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("guests");
    }

    @Test
    void splitEqual_twentyOneGuests_throwsBusinessException() {
        assertThatThrownBy(() -> factureService.splitEgal(10L, 21))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("guests");
    }

    @Test
    void splitEqual_nonExistentInvoice_throwsResourceNotFoundException() {
        given(factureRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> factureService.splitEgal(99L, 2))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void splitEqual_eachPart_containsEmptyItemsList() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 4);

        assertThat(result).hasSize(4);
        result.forEach(part -> assertThat(part.items()).isEmpty());
    }

    // ─── splitParSelection ────────────────────────────────────────────────────

    @Test
    void splitBySelection_twoGuestsDistinctItems_returnsCorrectSubtotals() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of(1L)),
                new SplitPartRequest("Bob",   List.of(2L))
        ));

        List<SplitResultDTO> result = factureService.splitParSelection(10L, request);

        assertThat(result).hasSize(2);
        SplitResultDTO alice = result.get(0);
        SplitResultDTO bob   = result.get(1);

        assertThat(alice.nomConvive()).isEqualTo("Alice");
        assertThat(alice.sousTotal()).isEqualByComparingTo(new BigDecimal("16.00"));
        assertThat(alice.items()).hasSize(1);
        assertThat(alice.items().get(0).description()).isEqualTo("Mojito");

        assertThat(bob.nomConvive()).isEqualTo("Bob");
        assertThat(bob.sousTotal()).isEqualByComparingTo(new BigDecimal("9.00"));
        assertThat(bob.items()).hasSize(1);
        assertThat(bob.items().get(0).description()).isEqualTo("Pina Colada");
    }

    @Test
    void splitParSelection_unConvivePrendTousLesItems_totalEgalFacture() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of(1L, 2L))
        ));

        List<SplitResultDTO> result = factureService.splitParSelection(10L, request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).sousTotal()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(result.get(0).items()).hasSize(2);
    }

    @Test
    void splitParSelection_multiQuantityItemsSplitAcrossGuests_calculatesAccurately() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        // Item 1 (Mojito): 2x @ 8.00 = 16.00
        // Alice takes 1 Mojito (8.00), Bob takes 1 Mojito (8.00) and 1 Pina Colada (9.00)
        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", null, List.of(new com.bar.gestioncocktail.dto.SplitPartItemRequest(1L, 1))),
                new SplitPartRequest("Bob", null, List.of(
                        new com.bar.gestioncocktail.dto.SplitPartItemRequest(1L, 1),
                        new com.bar.gestioncocktail.dto.SplitPartItemRequest(2L, 1)
                ))
        ));

        List<SplitResultDTO> result = factureService.splitParSelection(10L, request);

        assertThat(result).hasSize(2);
        SplitResultDTO alice = result.get(0);
        SplitResultDTO bob = result.get(1);

        assertThat(alice.nomConvive()).isEqualTo("Alice");
        assertThat(alice.sousTotal()).isEqualByComparingTo(new BigDecimal("8.00"));
        assertThat(alice.items().get(0).quantite()).isEqualTo(1);

        assertThat(bob.nomConvive()).isEqualTo("Bob");
        assertThat(bob.sousTotal()).isEqualByComparingTo(new BigDecimal("17.00")); // 8 + 9
        assertThat(bob.items()).hasSize(2);
    }

    @Test
    void splitParSelection_itemIdInconnu_throwsBusinessException() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of(999L))
        ));

        assertThatThrownBy(() -> factureService.splitParSelection(10L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("999")
                .hasMessageContaining("10");
    }

    @Test
    void splitBySelection_nonExistentInvoice_throwsResourceNotFoundException() {
        given(factureRepository.findById(77L)).willReturn(Optional.empty());

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of(1L))
        ));

        assertThatThrownBy(() -> factureService.splitParSelection(77L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("77");
    }

    @Test
    void splitParSelection_conviveSansItems_retourneSousTotalZero() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of())
        ));

        List<SplitResultDTO> result = factureService.splitParSelection(10L, request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).sousTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.get(0).items()).isEmpty();
    }

    @Test
    void splitBySelection_emptyRequest_returnsEmptyList() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of());

        List<SplitResultDTO> result = factureService.splitParSelection(10L, request);

        assertThat(result).isEmpty();
    }

    // ─── fusionnerFactures ───────────────────────────────────────────────────

    @Test
    void mergeInvoices_combinesItemsAndGeneratesNewInvoice() {
        TableEntity table = new TableEntity();
        table.setId(1L);

        Facture f1 = new Facture();
        f1.setId(1L);
        f1.setNumero("FAC-1");
        f1.setTable(table);
        FactureItem fi1 = new FactureItem();
        fi1.setQuantite(2);
        fi1.setPrixUnitaire(new BigDecimal("10.00"));
        fi1.setTotal(new BigDecimal("20.00"));
        f1.setItems(List.of(fi1));

        Facture f2 = new Facture();
        f2.setId(2L);
        f2.setNumero("FAC-2");
        f2.setTable(table);
        FactureItem fi2 = new FactureItem();
        fi2.setQuantite(1);
        fi2.setPrixUnitaire(new BigDecimal("15.00"));
        fi2.setTotal(new BigDecimal("15.00"));
        f2.setItems(List.of(fi2));

        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(100L);

        when(factureRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(f1, f2));
        when(factureRepository.save(any(Facture.class))).thenAnswer(inv -> inv.getArgument(0));

        MergeFacturesRequestDTO request = new MergeFacturesRequestDTO(List.of(1L, 2L), 1L);

        Facture merged = factureService.fusionnerFactures(request);

        assertThat(merged.getTotal()).isEqualByComparingTo(new BigDecimal("35.00"));
        assertThat(merged.getItems()).hasSize(2);
        assertThat(f1.isReglee()).isTrue();
        assertThat(f2.isReglee()).isTrue();
        verify(auditLogService).logAction(eq(null), eq("FUSION_FACTURES"), eq("Invoice"), any(), anyString(), eq(null));
    }

    @Test
    void getDailyRecap_calculatesDailyStatsCorrectly() {
        java.time.LocalDate today = java.time.LocalDate.now();
        TableEntity t1 = new TableEntity();
        t1.setCapacite(2);
        TableEntity t2 = new TableEntity();
        t2.setCapacite(1);

        Facture f1 = new Facture();
        f1.setId(101L);
        f1.setTable(t1);
        f1.setTotalTTC(new BigDecimal("50.00"));
        f1.setTotalHT(new BigDecimal("41.67"));
        f1.setTotalVAT(new BigDecimal("8.33"));
        f1.setModePaiement("CARTE");
        f1.setReglee(true);

        Facture f2 = new Facture();
        f2.setId(102L);
        f2.setTable(t2);
        f2.setTotalTTC(new BigDecimal("30.00"));
        f2.setTotalHT(new BigDecimal("25.00"));
        f2.setTotalVAT(new BigDecimal("5.00"));
        f2.setModePaiement("ESPECES");
        f2.setReglee(true);

        when(factureRepository.findByDateReglementBetween(any(), any())).thenReturn(List.of(f1, f2));

        com.bar.gestioncocktail.dto.DailyRecapDTO recap = factureService.getDailyRecap(today);

        assertThat(recap.date()).isEqualTo(today);
        assertThat(recap.totalCaTtc()).isEqualByComparingTo(new BigDecimal("80.00"));
        assertThat(recap.nombreFacturesReglees()).isEqualTo(2);
        assertThat(recap.panierMoyen()).isEqualByComparingTo(new BigDecimal("40.00"));
        assertThat(recap.nombreClients()).isEqualTo(3);
        assertThat(recap.ventilationModePaiement()).hasSize(2);
    }

    @Test
    void reglerFacture_avecPourboire_metAJourTotalEtMarqueReglee() {
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture result = factureService.reglerFacture(10L, "CARTE", new BigDecimal("5.00"));

        assertThat(result.isReglee()).isTrue();
        assertThat(result.getModePaiement()).isEqualTo("CARTE");
        assertThat(result.getPourboire()).isEqualByComparingTo(new BigDecimal("5.00"));
        assertThat(result.getTotalTTC()).isEqualByComparingTo(new BigDecimal("30.00"));
    }

    @Test
    void getTableAddition_success_withActiveCommandes() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);
        table.setZone("Terrasse");
        table.setServeurId(2L);
        table.setDateOccupation(LocalDateTime.of(2026, Month.AUGUST, 15, 20, 0));

        User waiter = new User();
        waiter.setId(2L);
        waiter.setUsername("john_waiter");
        waiter.setPrenom("John");
        waiter.setNom("Doe");

        Cocktail c1 = new Cocktail();
        c1.setId(101L);
        c1.setNom("Mojito");

        CommandeItem item = new CommandeItem();
        item.setId(11L);
        item.setCocktail(c1);
        item.setQuantite(2);
        item.setPrixUnitaire(new BigDecimal("8.00"));

        Commande cmd = new Commande();
        cmd.setId(201L);
        cmd.setTable(table);
        cmd.setStatut(CommandeStatut.LIVREE);
        cmd.setItems(List.of(item));

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of(cmd));
        when(factureRepository.findByTable(table)).thenReturn(List.of());
        when(userRepository.findById(2L)).thenReturn(Optional.of(waiter));

        TableAdditionResponseDTO addition = factureService.getTableAddition(1L);

        assertThat(addition.tableId()).isEqualTo(1L);
        assertThat(addition.tableNumero()).isEqualTo(5);
        assertThat(addition.zone()).isEqualTo("Terrasse");
        assertThat(addition.serveurNom()).isEqualTo("John Doe");
        assertThat(addition.items()).hasSize(1);
        assertThat(addition.totalTTC()).isEqualByComparingTo(new BigDecimal("16.00"));
        assertThat(addition.totalHT()).isEqualByComparingTo(new BigDecimal("13.33"));
        assertThat(addition.totalVAT()).isEqualByComparingTo(new BigDecimal("2.67"));
        assertThat(addition.nombreArticles()).isEqualTo(2);
        assertThat(addition.hasUnpaidFacture()).isFalse();
    }

    @Test
    void getTableAddition_tableNotFound_throwsResourceNotFoundException() {
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> factureService.getTableAddition(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Table not found with id: 999");
    }

    @Test
    void encaisserTable_success_cashWithDiscountAndTipAndLiberation() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(3);
        table.setOccupee(true);

        Cocktail c1 = new Cocktail();
        c1.setId(101L);
        c1.setNom("Mojito");

        CommandeItem item = new CommandeItem();
        item.setId(11L);
        item.setCocktail(c1);
        item.setQuantite(2);
        item.setPrixUnitaire(new BigDecimal("10.00"));

        Commande cmd = new Commande();
        cmd.setId(201L);
        cmd.setTable(table);
        cmd.setStatut(CommandeStatut.LIVREE);
        cmd.setItems(List.of(item));

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of(cmd));
        when(factureRepository.findByTable(table)).thenReturn(List.of());
        when(factureRepository.count()).thenReturn(10L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> {
            Facture f = i.getArgument(0);
            f.setId(55L);
            return f;
        });

        EncaissementRequestDTO request = new EncaissementRequestDTO(
                "ESPECES",
                new BigDecimal("2.00"),
                new BigDecimal("5.00"),
                BigDecimal.ZERO,
                new BigDecimal("20.00"),
                "Encaissement terrasse",
                true,
                null
        );

        com.bar.gestioncocktail.dto.FactureResponseDTO result = factureService.encaisserTable(1L, request);

        assertThat(result.id()).isEqualTo(55L);
        assertThat(result.modePaiement()).isEqualTo("ESPECES");
        assertThat(result.pourboire()).isEqualByComparingTo(new BigDecimal("2.00"));
        assertThat(result.totalTTC()).isEqualByComparingTo(new BigDecimal("17.00")); // 20 - 5 + 2 = 17
        assertThat(result.reglee()).isTrue();

        assertThat(cmd.getStatut()).isEqualTo(CommandeStatut.REGLEE);
        assertThat(table.isOccupee()).isFalse();

        verify(notificationService).notifierLiberationTable(table);
        verify(notificationService).notifierChangementStatutCommande(201L, CommandeStatut.LIVREE, CommandeStatut.REGLEE);
    }

    @Test
    void encaisserTable_noActiveCommandes_throwsBusinessException() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(3);
        table.setOccupee(true);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of());
        when(factureRepository.findByTable(table)).thenReturn(List.of());

        EncaissementRequestDTO request = new EncaissementRequestDTO(
                "CARTE",
                null,
                null,
                null,
                null,
                null,
                true,
                null
        );

        assertThatThrownBy(() -> factureService.encaisserTable(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No active orders to checkout for table 3");
    }

    @Test
    void getTableAddition_withExistingUnpaidFactureItems_andServeurFromCommande() {
        TableEntity table = new TableEntity();
        table.setId(2L);
        table.setNumero(7);
        table.setServeurId(null);

        User serveur = new User();
        serveur.setId(88L);
        serveur.setUsername("julien");

        Facture unpaidFacture = new Facture();
        unpaidFacture.setId(102L);
        unpaidFacture.setTable(table);
        unpaidFacture.setReglee(false);

        FactureItem fi = new FactureItem();
        fi.setId(1L);
        fi.setFacture(unpaidFacture);
        fi.setDescription("Cosmopolitan");
        fi.setQuantite(2);
        fi.setPrixUnitaire(new BigDecimal("9.00"));
        fi.setTotal(new BigDecimal("18.00"));
        fi.setPriceHT(new BigDecimal("15.00"));
        fi.setVatAmount(new BigDecimal("3.00"));
        unpaidFacture.setItems(List.of(fi));

        table.setServeurId(88L);
        when(tableRepository.findById(2L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of());
        when(factureRepository.findByTable(table)).thenReturn(List.of(unpaidFacture));
        when(userRepository.findById(88L)).thenReturn(Optional.of(serveur));

        TableAdditionResponseDTO addition = factureService.getTableAddition(2L);

        assertThat(addition.hasUnpaidFacture()).isTrue();
        assertThat(addition.existingFactureId()).isEqualTo(102L);
        assertThat(addition.items()).hasSize(1);
        assertThat(addition.items().get(0).cocktailNom()).isEqualTo("Cosmopolitan");
        assertThat(addition.totalTTC()).isEqualByComparingTo(new BigDecimal("18.00"));
        assertThat(addition.serveurNom()).isEqualTo("julien");
    }

    @Test
    void encaisserTable_withExistingUnpaidFacture_andPercentageDiscount_andNoLiberation() {
        TableEntity table = new TableEntity();
        table.setId(2L);
        table.setNumero(7);
        table.setOccupee(true);

        Facture unpaidFacture = new Facture();
        unpaidFacture.setId(102L);
        unpaidFacture.setNumero("FAC-2026-00102");
        unpaidFacture.setTable(table);
        unpaidFacture.setReglee(false);

        FactureItem fi = new FactureItem();
        fi.setId(1L);
        fi.setFacture(unpaidFacture);
        fi.setDescription("Cosmopolitan");
        fi.setQuantite(2);
        fi.setPrixUnitaire(new BigDecimal("12.00"));
        fi.setTotal(new BigDecimal("24.00"));
        fi.setPriceHT(new BigDecimal("20.00"));
        fi.setVatAmount(new BigDecimal("4.00"));
        unpaidFacture.setItems(List.of(fi));

        when(tableRepository.findById(2L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of());
        when(factureRepository.findByTable(table)).thenReturn(List.of(unpaidFacture));
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        EncaissementRequestDTO request = new EncaissementRequestDTO(
                "CARTE",
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("10.00"), // 10% discount -> -2.40€
                new BigDecimal("21.60"),
                "Remise fidelite",
                false, // do NOT liberate table
                List.of()
        );

        com.bar.gestioncocktail.dto.FactureResponseDTO result = factureService.encaisserTable(2L, request);

        assertThat(result.id()).isEqualTo(102L);
        assertThat(result.modePaiement()).isEqualTo("CARTE");
        assertThat(result.totalTTC()).isEqualByComparingTo(new BigDecimal("21.60"));
        assertThat(result.reglee()).isTrue();
        assertThat(table.isOccupee()).isTrue(); // Table not liberated
    }

    @Test
    void encaisserTable_tableNotFound_throwsResourceNotFoundException() {
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        EncaissementRequestDTO request = new EncaissementRequestDTO("CARTE", null, null, null, null, null, true, null);

        assertThatThrownBy(() -> factureService.encaisserTable(999L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Table not found with id: 999");
    }

    @Test
    void getTableAddition_withVarianteAndServeurFromActiveCommande() {
        TableEntity table = new TableEntity();
        table.setId(3L);
        table.setNumero(12);
        table.setServeurId(null);

        User serveur = new User();
        serveur.setId(99L);
        serveur.setUsername("sophie");

        Cocktail c1 = new Cocktail();
        c1.setId(50L);
        c1.setNom("Gin Tonic");

        com.bar.gestioncocktail.model.CocktailVariante v = new com.bar.gestioncocktail.model.CocktailVariante();
        v.setId(22L);
        v.setNom("Concombre");

        CommandeItem item = new CommandeItem();
        item.setId(401L);
        item.setCocktail(c1);
        item.setVariante(v);
        item.setQuantite(3);
        item.setPrixUnitaire(new BigDecimal("12.00"));

        Commande cmd = new Commande();
        cmd.setId(501L);
        cmd.setTable(table);
        cmd.setServeur(serveur);
        cmd.setStatut(CommandeStatut.PRET);
        cmd.setItems(List.of(item));

        when(tableRepository.findById(3L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of(cmd));
        when(factureRepository.findByTable(table)).thenReturn(List.of());

        TableAdditionResponseDTO addition = factureService.getTableAddition(3L);

        assertThat(addition.items()).hasSize(1);
        assertThat(addition.items().get(0).cocktailNom()).isEqualTo("Gin Tonic");
        assertThat(addition.items().get(0).varianteNom()).isEqualTo("Concombre");
        assertThat(addition.items().get(0).quantite()).isEqualTo(3);
        assertThat(addition.totalTTC()).isEqualByComparingTo(new BigDecimal("36.00"));
        assertThat(addition.serveurNom()).isEqualTo("sophie");
    }

    @Test
    void encaisserTable_withVarianteAndCreationOfNewFacture() {
        TableEntity table = new TableEntity();
        table.setId(4L);
        table.setNumero(14);
        table.setOccupee(true);

        Cocktail c1 = new Cocktail();
        c1.setId(60L);
        c1.setNom("Spritz");

        com.bar.gestioncocktail.model.CocktailVariante v = new com.bar.gestioncocktail.model.CocktailVariante();
        v.setId(33L);
        v.setNom("Limoncello");

        CommandeItem item = new CommandeItem();
        item.setId(402L);
        item.setCocktail(c1);
        item.setVariante(v);
        item.setQuantite(2);
        item.setPrixUnitaire(new BigDecimal("8.00"));

        Commande cmd = new Commande();
        cmd.setId(502L);
        cmd.setTable(table);
        cmd.setStatut(CommandeStatut.EN_ATTENTE);
        cmd.setItems(List.of(item));

        when(tableRepository.findById(4L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of(cmd));
        when(factureRepository.findByTable(table)).thenReturn(List.of());
        when(factureRepository.count()).thenReturn(5L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> {
            Facture f = i.getArgument(0);
            f.setId(88L);
            return f;
        });

        EncaissementRequestDTO request = new EncaissementRequestDTO(
                "TITRES_RESTAURANT",
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("16.00"),
                null,
                true,
                List.of(502L)
        );

        com.bar.gestioncocktail.dto.FactureResponseDTO result = factureService.encaisserTable(4L, request);

        assertThat(result.id()).isEqualTo(88L);
        assertThat(result.modePaiement()).isEqualTo("TITRES_RESTAURANT");
        assertThat(result.totalTTC()).isEqualByComparingTo(new BigDecimal("16.00"));
        assertThat(result.reglee()).isTrue();
        assertThat(cmd.getStatut()).isEqualTo(CommandeStatut.REGLEE);
        assertThat(table.isOccupee()).isFalse();
    }

    @Test
    void mergeInvoices_success_mergesTwoInvoicesIntoOne() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);

        Facture f1 = new Facture();
        f1.setId(10L);
        f1.setNumero("FAC-1");
        f1.setTable(table);
        f1.setReglee(false);

        FactureItem factureItem1 = new FactureItem();
        factureItem1.setId(101L);
        factureItem1.setQuantite(2);
        factureItem1.setPrixUnitaire(new BigDecimal("8.00"));
        factureItem1.setTotal(new BigDecimal("16.00"));
        factureItem1.setDescription("Mojito");
        f1.setItems(List.of(factureItem1));

        Facture f2 = new Facture();
        f2.setId(20L);
        f2.setNumero("FAC-2");
        f2.setTable(table);
        f2.setReglee(false);

        FactureItem factureItem2 = new FactureItem();
        factureItem2.setId(102L);
        factureItem2.setQuantite(1);
        factureItem2.setPrixUnitaire(new BigDecimal("10.00"));
        factureItem2.setTotal(null); // tests null total branch
        factureItem2.setDescription("Gin Tonic");
        f2.setItems(List.of(factureItem2));

        when(factureRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(f1, f2));

        Query queryMock = mock(Query.class);
        when(entityManager.createNativeQuery("SELECT NEXTVAL('facture_seq')")).thenReturn(queryMock);
        when(queryMock.getSingleResult()).thenReturn(123L);

        when(factureRepository.save(any(Facture.class))).thenAnswer(invocation -> {
            Facture saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(99L);
            }
            return saved;
        });

        MergeFacturesRequestDTO request = new MergeFacturesRequestDTO(List.of(10L, 20L), null);
        Facture merged = factureService.fusionnerFactures(request);

        assertThat(merged).isNotNull();
        assertThat(merged.getId()).isEqualTo(99L);
        assertThat(merged.getNumero()).startsWith("FAC-MERGE-");
        assertThat(merged.getTotal()).isEqualByComparingTo(new BigDecimal("26.00"));
        assertThat(merged.getItems()).hasSize(2);
        assertThat(f1.isReglee()).isTrue();
        assertThat(f1.getModePaiement()).isEqualTo("MERGED");
        assertThat(f2.isReglee()).isTrue();
        assertThat(f2.getModePaiement()).isEqualTo("MERGED");
    }

    @Test
    void mergeInvoices_withTargetTableId_usesTargetTable() {
        TableEntity tableOriginal = new TableEntity();
        tableOriginal.setId(1L);

        TableEntity tableTarget = new TableEntity();
        tableTarget.setId(2L);

        Facture f1 = new Facture();
        f1.setId(10L);
        f1.setTable(tableOriginal);
        f1.setReglee(false);

        Facture f2 = new Facture();
        f2.setId(20L);
        f2.setTable(tableOriginal);
        f2.setReglee(false);

        when(factureRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(f1, f2));
        when(tableRepository.findById(2L)).thenReturn(Optional.of(tableTarget));

        Query queryMock = mock(Query.class);
        when(entityManager.createNativeQuery("SELECT NEXTVAL('facture_seq')")).thenReturn(queryMock);
        when(queryMock.getSingleResult()).thenReturn(124L);

        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        MergeFacturesRequestDTO request = new MergeFacturesRequestDTO(List.of(10L, 20L), 2L);
        Facture merged = factureService.fusionnerFactures(request);

        assertThat(merged.getTable()).isEqualTo(tableTarget);
    }

    @Test
    void mergeInvoices_fewerThanTwoInvoices_throwsBusinessException() {
        Facture f1 = new Facture();
        f1.setId(10L);
        when(factureRepository.findAllById(List.of(10L))).thenReturn(List.of(f1));

        MergeFacturesRequestDTO request = new MergeFacturesRequestDTO(List.of(10L), null);

        assertThatThrownBy(() -> factureService.fusionnerFactures(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("At least 2 valid invoices are required for merge.");
    }

    @Test
    void mergeInvoices_alreadySettledInvoice_throwsBusinessException() {
        Facture f1 = new Facture();
        f1.setId(10L);
        f1.setNumero("FAC-1");
        f1.setReglee(true);

        Facture f2 = new Facture();
        f2.setId(20L);
        f2.setNumero("FAC-2");
        f2.setReglee(false);

        when(factureRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(f1, f2));

        MergeFacturesRequestDTO request = new MergeFacturesRequestDTO(List.of(10L, 20L), null);

        assertThatThrownBy(() -> factureService.fusionnerFactures(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("is already settled and cannot be merged.");
    }

    @Test
    void encaisserPart_equalSplit_savesReglementAndReturnsDTO() {
        Facture f = new Facture();
        f.setId(10L);
        f.setNumero("FAC-SPLIT-1");
        f.setTotal(new BigDecimal("60.00"));
        f.setTotalTTC(new BigDecimal("60.00"));
        f.setReglee(false);

        when(factureRepository.findById(10L)).thenReturn(Optional.of(f));
        when(factureReglementRepository.save(any(com.bar.gestioncocktail.model.FactureReglement.class)))
                .thenAnswer(inv -> {
                    com.bar.gestioncocktail.model.FactureReglement r = inv.getArgument(0);
                    r.setId(101L);
                    return r;
                });

        com.bar.gestioncocktail.model.FactureReglement savedPart1 = new com.bar.gestioncocktail.model.FactureReglement();
        savedPart1.setId(101L);
        savedPart1.setFacture(f);
        savedPart1.setMontant(new BigDecimal("30.00"));
        savedPart1.setPourboire(new BigDecimal("2.00"));
        savedPart1.setTotalRegle(new BigDecimal("32.00"));
        savedPart1.setNomConvive("Guest 1");
        savedPart1.setPartIndex(1);
        savedPart1.setTotalParts(2);
        savedPart1.setModePaiement("CARTE");
        savedPart1.setTypeSplit("EGAL");

        when(factureReglementRepository.findByFactureIdOrderByIdAsc(10L)).thenReturn(List.of(savedPart1));

        com.bar.gestioncocktail.dto.EncaisserPartRequest req = new com.bar.gestioncocktail.dto.EncaisserPartRequest(
                "Guest 1", 1, 2, new BigDecimal("30.00"), new BigDecimal("2.00"),
                new BigDecimal("32.00"), "CARTE", "EGAL", List.of()
        );

        com.bar.gestioncocktail.dto.FactureReglementDTO result = factureService.encaisserPart(10L, req);

        assertThat(result).isNotNull();
        assertThat(result.nomConvive()).isEqualTo("Guest 1");
        assertThat(result.montant()).isEqualByComparingTo("30.00");
        assertThat(result.pourboire()).isEqualByComparingTo("2.00");
        assertThat(f.isReglee()).isFalse(); // only 30/60 paid
    }

    @Test
    void encaisserPart_completesFullPayment_marksInvoiceSettled() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setOccupee(true);

        Facture f = new Facture();
        f.setId(10L);
        f.setTable(table);
        f.setNumero("FAC-SPLIT-2");
        f.setTotal(new BigDecimal("40.00"));
        f.setTotalTTC(new BigDecimal("40.00"));
        f.setReglee(false);

        when(factureRepository.findById(10L)).thenReturn(Optional.of(f));
        when(factureReglementRepository.save(any(com.bar.gestioncocktail.model.FactureReglement.class)))
                .thenAnswer(inv -> {
                    com.bar.gestioncocktail.model.FactureReglement r = inv.getArgument(0);
                    r.setId(102L);
                    return r;
                });

        com.bar.gestioncocktail.model.FactureReglement part1 = new com.bar.gestioncocktail.model.FactureReglement();
        part1.setId(101L);
        part1.setMontant(new BigDecimal("20.00"));

        com.bar.gestioncocktail.model.FactureReglement part2 = new com.bar.gestioncocktail.model.FactureReglement();
        part2.setId(102L);
        part2.setMontant(new BigDecimal("20.00"));
        part2.setPourboire(new BigDecimal("3.00"));

        when(factureReglementRepository.findByFactureIdOrderByIdAsc(10L)).thenReturn(List.of(part1, part2));

        com.bar.gestioncocktail.dto.EncaisserPartRequest req = new com.bar.gestioncocktail.dto.EncaisserPartRequest(
                "Guest 2", 2, 2, new BigDecimal("20.00"), new BigDecimal("3.00"),
                new BigDecimal("23.00"), "ESPECES", "EGAL", List.of()
        );

        com.bar.gestioncocktail.dto.FactureReglementDTO result = factureService.encaisserPart(10L, req);

        assertThat(result).isNotNull();
        assertThat(f.isReglee()).isTrue();
        assertThat(f.getModePaiement()).isEqualTo("MIXTE_SPLIT");
        verify(factureRepository).save(f);
        verify(tableRepository).save(table);
        verify(notificationService).notifierLiberationTable(table);
    }

    @Test
    void getReglementsByFactureId_returnsList() {
        when(factureRepository.existsById(10L)).thenReturn(true);
        com.bar.gestioncocktail.model.FactureReglement r = new com.bar.gestioncocktail.model.FactureReglement();
        r.setId(1L);
        r.setNomConvive("Alice");
        r.setPartIndex(1);
        r.setMontant(new BigDecimal("15.00"));
        r.setTotalRegle(new BigDecimal("15.00"));
        r.setModePaiement("CARTE");
        r.setTypeSplit("SELECTION");
        r.setItemsJson("[{\"itemId\":1,\"description\":\"Mojito\",\"quantite\":1,\"prixUnitaire\":15.00,\"total\":15.00}]");

        when(factureReglementRepository.findByFactureIdOrderByIdAsc(10L)).thenReturn(List.of(r));

        List<com.bar.gestioncocktail.dto.FactureReglementDTO> list = factureService.getReglementsByFactureId(10L);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).nomConvive()).isEqualTo("Alice");
        assertThat(list.get(0).items()).hasSize(1);
        assertThat(list.get(0).items().get(0).description()).isEqualTo("Mojito");
    }

    @Test
    void getReglementsByFactureId_notFound_throwsException() {
        when(factureRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> factureService.getReglementsByFactureId(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void encaisserPart_withItemsAndNullReglementsList() {
        Facture f = new Facture();
        f.setId(20L);
        f.setTotal(new BigDecimal("15.00"));
        f.setTotalTTC(null);
        f.setReglements(null);

        when(factureRepository.findById(20L)).thenReturn(Optional.of(f));
        when(factureReglementRepository.save(any())).thenAnswer(inv -> {
            com.bar.gestioncocktail.model.FactureReglement reg = inv.getArgument(0);
            reg.setId(5L);
            return reg;
        });
        when(factureReglementRepository.findByFactureIdOrderByIdAsc(20L)).thenReturn(List.of());

        com.bar.gestioncocktail.dto.SplitResultDTO.SplitItemDTO itemReq = new com.bar.gestioncocktail.dto.SplitResultDTO.SplitItemDTO(
                10L, "Mojito", 1, new BigDecimal("7.50"), new BigDecimal("7.50")
        );
        com.bar.gestioncocktail.dto.EncaisserPartRequest req = new com.bar.gestioncocktail.dto.EncaisserPartRequest(
                "Bob", 1, 2, new BigDecimal("7.50"), BigDecimal.ZERO, new BigDecimal("7.50"), "CARTE", "SELECTION", List.of(itemReq)
        );

        com.bar.gestioncocktail.dto.FactureReglementDTO res = factureService.encaisserPart(20L, req);

        assertThat(res).isNotNull();
        assertThat(f.getReglements()).hasSize(1);
    }

    @Test
    void getTableAddition_calculatesTotalsAndOrders() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);
        table.setZone("Terrasse");

        Commande cmd = new Commande();
        cmd.setId(100L);
        cmd.setTable(table);
        cmd.setStatut(CommandeStatut.EN_PREPARATION);

        Cocktail c = new Cocktail();
        c.setId(1L);
        c.setNom("Mojito");

        CommandeItem ci = new CommandeItem();
        ci.setCocktail(c);
        ci.setQuantite(2);
        ci.setPrixUnitaire(new BigDecimal("10.00"));
        cmd.setItems(List.of(ci));

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of(cmd));
        when(factureRepository.findByTable(table)).thenReturn(List.of());

        TableAdditionResponseDTO resp = factureService.getTableAddition(1L);

        assertThat(resp).isNotNull();
        assertThat(resp.tableNumero()).isEqualTo(5);
        assertThat(resp.totalTTC()).isEqualByComparingTo("20.00");
        assertThat(resp.nombreArticles()).isEqualTo(2);
    }

    @Test
    void encaisserTable_settlesOrderAndFreesTable() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);
        table.setOccupee(true);

        Commande cmd = new Commande();
        cmd.setId(100L);
        cmd.setTable(table);
        cmd.setStatut(CommandeStatut.PRET);

        Cocktail c = new Cocktail();
        c.setId(1L);
        c.setNom("Mojito");

        CommandeItem ci = new CommandeItem();
        ci.setCocktail(c);
        ci.setQuantite(1);
        ci.setPrixUnitaire(new BigDecimal("10.00"));
        cmd.setItems(List.of(ci));

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.findByTable(table)).thenReturn(List.of(cmd));
        when(factureRepository.findByTable(table)).thenReturn(List.of());
        when(factureRepository.save(any(Facture.class))).thenAnswer(inv -> {
            Facture f = inv.getArgument(0);
            f.setId(50L);
            f.setNumero("FAC-2026-00050");
            return f;
        });

        EncaissementRequestDTO req = new EncaissementRequestDTO(
                "CARTE", new BigDecimal("2.00"), null, null, null, "Note", true, List.of(100L)
        );

        com.bar.gestioncocktail.dto.FactureResponseDTO res = factureService.encaisserTable(1L, req);

        assertThat(res).isNotNull();
        assertThat(res.reglee()).isTrue();
        assertThat(cmd.getStatut()).isEqualTo(CommandeStatut.REGLEE);
        assertThat(table.isOccupee()).isFalse();
    }

    @Test
    void exportCSV_formatsRowsCorrectly() {
        when(factureRepository.findAll()).thenReturn(List.of(facture));

        String csv = factureService.exportCSV(null, null);

        assertThat(csv)
                .startsWith("\uFEFF")
                .contains("N° Facture;Date;Table")
                .contains("25.00");
    }

    @Test
    void finalizeFacture_setsRetentionAndArchivedPath() {
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));
        when(factureRepository.save(any(Facture.class))).thenAnswer(inv -> inv.getArgument(0));

        Facture fin = factureService.finalizeFacture(10L, "Sample PDF content".getBytes());

        assertThat(fin.isFinalized()).isTrue();
        assertThat(fin.getPdfHash()).isNotNull();
        assertThat(fin.getArchivedPdfPath()).isNotNull();
    }

    @Test
    void verifyIntegrity_validatesMatchingHash() {
        byte[] pdf = "Sample PDF".getBytes();
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));
        when(factureRepository.save(any(Facture.class))).thenAnswer(inv -> inv.getArgument(0));

        Facture fin = factureService.finalizeFacture(10L, pdf);

        Map<String, Object> check = factureService.verifyIntegrity(10L, pdf);

        assertThat(check)
                .containsEntry("valid", true)
                .containsEntry("storedHash", fin.getPdfHash());
    }

    @Test
    void updateFacture_and_deleteFacture() {
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));
        when(factureRepository.save(any(Facture.class))).thenAnswer(inv -> inv.getArgument(0));

        Facture update = new Facture();
        update.setTotal(new BigDecimal("100.00"));
        update.setReglee(true);

        Facture res = factureService.updateFacture(10L, update);
        assertThat(res.getTotal()).isEqualByComparingTo("100.00");
        assertThat(res.isReglee()).isTrue();

        factureService.deleteFacture(10L);
        verify(factureRepository).deleteById(10L);
    }

    @Test
    void splitParSelection_withGranularSelections_computesLineTotals() {
        FactureItem item = new FactureItem();
        item.setId(101L);
        item.setDescription("Cocktail Passion");
        item.setQuantite(2);
        item.setPrixUnitaire(new BigDecimal("12.00"));
        item.setTotal(new BigDecimal("24.00"));

        facture.setItems(List.of(item));
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));

        com.bar.gestioncocktail.dto.SplitPartItemRequest itemReq = new com.bar.gestioncocktail.dto.SplitPartItemRequest(101L, 1);
        com.bar.gestioncocktail.dto.SplitPartRequest partReq = new com.bar.gestioncocktail.dto.SplitPartRequest(
                "Bob", null, List.of(itemReq)
        );
        SplitAdditionRequest req = new SplitAdditionRequest(List.of(partReq));

        List<SplitResultDTO> results = factureService.splitParSelection(10L, req);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).items()).hasSize(1);
        assertThat(results.get(0).items().get(0).quantite()).isEqualTo(1);
        assertThat(results.get(0).sousTotal()).isEqualByComparingTo("12.00");
    }

    @Test
    void splitParSelection_withUnknownItem_throwsBusinessException() {
        facture.setItems(List.of());
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));

        com.bar.gestioncocktail.dto.SplitPartItemRequest itemReq = new com.bar.gestioncocktail.dto.SplitPartItemRequest(999L, 1);
        com.bar.gestioncocktail.dto.SplitPartRequest partReq = new com.bar.gestioncocktail.dto.SplitPartRequest(
                "Bob", null, List.of(itemReq)
        );
        SplitAdditionRequest req = new SplitAdditionRequest(List.of(partReq));

        assertThatThrownBy(() -> factureService.splitParSelection(10L, req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Item 999 does not belong to invoice 10");
    }

    @Test
    void annulerFactureWithAvoir_createsAvoirAndUpdatesInvoice() {
        when(factureRepository.findById(10L)).thenReturn(Optional.of(facture));
        when(avoirCreditRepository.count()).thenReturn(2L);
        when(avoirCreditRepository.save(any(com.bar.gestioncocktail.model.AvoirCredit.class))).thenAnswer(inv -> {
            com.bar.gestioncocktail.model.AvoirCredit a = inv.getArgument(0);
            a.setId(3L);
            return a;
        });

        com.bar.gestioncocktail.model.AvoirCredit avoir = factureService.annulerFactureWithAvoir(10L, "Client refund");

        assertThat(avoir).isNotNull();
        assertThat(avoir.getNumero()).startsWith("AV-");
        assertThat(facture.getNotes()).contains("Client refund");
        verify(factureRepository).save(facture);
    }
}
