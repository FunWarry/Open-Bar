package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitPartRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.repository.FactureItemRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FactureServiceTest {

    @Mock
    FactureRepository factureRepository;

    @Mock
    FactureItemRepository factureItemRepository;

    @Mock
    EntityManager entityManager;

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
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(1L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture facture = new Facture();
        facture.setTotal(BigDecimal.TEN);
        facture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(facture);

        // Assert
        assertThat(result.getNumero()).isNotNull();
        String moisAttendu = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        assertThat(result.getNumero()).isEqualTo("FAC-" + moisAttendu + "-0001");
    }

    @Test
    void createFacture_numeroIncrementeAvecSequence() {
        // Arrange
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(42L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture facture = new Facture();
        facture.setTotal(BigDecimal.TEN);
        facture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(facture);

        // Assert
        String moisAttendu = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        assertThat(result.getNumero()).isEqualTo("FAC-" + moisAttendu + "-0042");
    }

    @Test
    void createFacture_setDateFacture() {
        // Arrange
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(1L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture facture = new Facture();
        facture.setTotal(BigDecimal.TEN);
        facture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(facture);

        // Assert
        assertThat(result.getDateFacture()).isNotNull();
        assertThat(result.getDateFacture()).isBeforeOrEqualTo(LocalDateTime.now());
    }

    // ─── splitEgal ────────────────────────────────────────────────────────────

    @Test
    void splitEgal_deuxConvives_retourneDeuxPartsEgales() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 2);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).sousTotal()).isEqualByComparingTo(new BigDecimal("12.50"));
        assertThat(result.get(1).sousTotal()).isEqualByComparingTo(new BigDecimal("12.50"));
        assertThat(result.get(0).nomConvive()).isEqualTo("Convive 1");
        assertThat(result.get(1).nomConvive()).isEqualTo("Convive 2");
    }

    @Test
    void splitEgal_troisConvives_arrondiHalfUp() {
        // total 25.00 / 3 = 8.33 (arrondi HALF_UP)
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 3);

        assertThat(result).hasSize(3);
        result.forEach(part ->
            assertThat(part.sousTotal()).isEqualByComparingTo(new BigDecimal("8.33"))
        );
    }

    @Test
    void splitEgal_utiliseTotalTTCSiDisponible() {
        // totalTTC prévaut sur total
        facture.setTotal(new BigDecimal("20.00"));
        facture.setTotalTTC(new BigDecimal("24.00")); // avec pourboire
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 2);

        assertThat(result.get(0).sousTotal()).isEqualByComparingTo(new BigDecimal("12.00"));
    }

    @Test
    void splitEgal_sansTotal_utiliseZero() {
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
    void splitEgal_unConvive_throwsIllegalArgument() {
        assertThatThrownBy(() -> factureService.splitEgal(10L, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("convives");
    }

    @Test
    void splitEgal_vingtEtUnConvives_throwsIllegalArgument() {
        assertThatThrownBy(() -> factureService.splitEgal(10L, 21))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("convives");
    }

    @Test
    void splitEgal_factureInexistante_throwsRuntimeException() {
        given(factureRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> factureService.splitEgal(99L, 2))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("99");
    }

    @Test
    void splitEgal_chaquePart_contientListeItemsVide() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        List<SplitResultDTO> result = factureService.splitEgal(10L, 4);

        assertThat(result).hasSize(4);
        result.forEach(part -> assertThat(part.items()).isEmpty());
    }

    // ─── splitParSelection ────────────────────────────────────────────────────

    @Test
    void splitParSelection_deuxConvivesItemsDistincts_retourneSubtotauxCorrects() {
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
    void splitParSelection_itemIdInconnu_throwsIllegalArgument() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of(999L))
        ));

        assertThatThrownBy(() -> factureService.splitParSelection(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("999")
                .hasMessageContaining("10");
    }

    @Test
    void splitParSelection_factureInexistante_throwsRuntimeException() {
        given(factureRepository.findById(77L)).willReturn(Optional.empty());

        SplitAdditionRequest request = new SplitAdditionRequest(List.of(
                new SplitPartRequest("Alice", List.of(1L))
        ));

        assertThatThrownBy(() -> factureService.splitParSelection(77L, request))
                .isInstanceOf(RuntimeException.class)
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
    void splitParSelection_requeteVide_retourneListeVide() {
        given(factureRepository.findById(10L)).willReturn(Optional.of(facture));

        SplitAdditionRequest request = new SplitAdditionRequest(List.of());

        List<SplitResultDTO> result = factureService.splitParSelection(10L, request);

        assertThat(result).isEmpty();
    }
}
