package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.DashboardStatsDTO;
import com.bar.gestioncocktail.dto.TopCocktailDTO;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock CommandeRepository commandeRepository;
    @Mock FactureRepository factureRepository;
    @Mock TableRepository tableRepository;
    @Mock IngredientRepository ingredientRepository;
    @Spy TimeService timeService = new TimeService(null);

    @InjectMocks DashboardService dashboardService;


    @BeforeEach
    void setUp() {
        // stubs par défaut neutres pour éviter les NPE dans les tests ciblés
        given(commandeRepository.countByStatut(any())).willReturn(0L);
        given(commandeRepository.count()).willReturn(0L);
        given(commandeRepository.sumTotalByStatutAndDateCommandeAfter(any(), any())).willReturn(BigDecimal.ZERO);
        given(commandeRepository.findTopCocktails(any())).willReturn(List.of());
        given(tableRepository.countByOccupeeTrue()).willReturn(0L);
        given(tableRepository.count()).willReturn(0L);
        given(ingredientRepository.countIngredientsSousSeuil()).willReturn(0L);
    }

    // ─── commandesTotales ─────────────────────────────────────────────────────

    @Test
    void getStats_commandesTotales_retourneCompteDepotRepository() {
        given(commandeRepository.count()).willReturn(42L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesTotales()).isEqualTo(42L);
    }

    // ─── statuts individuels ──────────────────────────────────────────────────

    @Test
    void getStats_commandesEnAttente_retourneCompteStatutEnAttente() {
        given(commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE)).willReturn(5L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesEnAttente()).isEqualTo(5L);
    }

    @Test
    void getStats_commandesEnPreparation_retourneCompteStatutEnPreparation() {
        given(commandeRepository.countByStatut(CommandeStatut.EN_PREPARATION)).willReturn(3L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesEnPreparation()).isEqualTo(3L);
    }

    @Test
    void getStats_commandesPret_retourneCompteStatutPret() {
        given(commandeRepository.countByStatut(CommandeStatut.PRET)).willReturn(2L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesPret()).isEqualTo(2L);
    }

    @Test
    void getStats_commandesLivrees_retourneCompteStatutLivree() {
        given(commandeRepository.countByStatut(CommandeStatut.LIVREE)).willReturn(7L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesLivrees()).isEqualTo(7L);
    }

    // ─── chiffre d'affaires ───────────────────────────────────────────────────

    @Test
    void getStats_caJour_retourneSommeCommandesRegleesDuJour() {
        given(commandeRepository.sumTotalByStatutAndDateCommandeAfter(
                eq(CommandeStatut.REGLEE), any()))
                .willReturn(new BigDecimal("150.00"), new BigDecimal("900.00"));

        DashboardStatsDTO stats = dashboardService.getStats();

        // Premier appel = jour, deuxième = mois
        assertThat(stats.chiffreAffairesJour()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    void getStats_caMois_retourneSommeCommandesRegleesDuMois() {
        given(commandeRepository.sumTotalByStatutAndDateCommandeAfter(
                eq(CommandeStatut.REGLEE), any()))
                .willReturn(new BigDecimal("150.00"), new BigDecimal("3200.50"));

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.chiffreAffairesMois()).isEqualByComparingTo(new BigDecimal("3200.50"));
    }

    @Test
    void getStats_caJour_repositoryRetourneNull_retourneZero() {
        given(commandeRepository.sumTotalByStatutAndDateCommandeAfter(
                eq(CommandeStatut.REGLEE), any()))
                .willReturn(null);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.chiffreAffairesJour()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void getStats_caMois_repositoryLanceException_retourneZero() {
        given(commandeRepository.sumTotalByStatutAndDateCommandeAfter(
                eq(CommandeStatut.REGLEE), any()))
                .willThrow(new RuntimeException("DB indisponible"));

        DashboardStatsDTO stats = dashboardService.getStats();

        // Le service gère l'exception et retourne ZERO — aucune exception ne remonte
        assertThat(stats.chiffreAffairesJour()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(stats.chiffreAffairesMois()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ─── tables ───────────────────────────────────────────────────────────────

    @Test
    void getStats_tablesOccupees_retourneCompteTableOccupeeTrue() {
        given(tableRepository.countByOccupeeTrue()).willReturn(4L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.tablesOccupees()).isEqualTo(4L);
    }

    @Test
    void getStats_tablesTotales_retourneCompteTotal() {
        given(tableRepository.count()).willReturn(10L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.tablesTotales()).isEqualTo(10L);
    }

    @Test
    void getStats_toutesTablesLibres_tablesOccupeesEstZero() {
        given(tableRepository.countByOccupeeTrue()).willReturn(0L);
        given(tableRepository.count()).willReturn(8L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.tablesOccupees()).isZero();
        assertThat(stats.tablesTotales()).isEqualTo(8L);
    }

    // ─── top cocktails ────────────────────────────────────────────────────────

    @Test
    void getStats_topCocktails_retourneListeDepuisRepository() {
        List<TopCocktailDTO> top = List.of(
                new TopCocktailDTO(1L, "Mojito", 25L),
                new TopCocktailDTO(2L, "Daiquiri", 18L)
        );
        given(commandeRepository.findTopCocktails(PageRequest.of(0, 5))).willReturn(top);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.topCocktails()).hasSize(2);
        assertThat(stats.topCocktails().get(0).nom()).isEqualTo("Mojito");
        assertThat(stats.topCocktails().get(0).nombreCommandes()).isEqualTo(25L);
    }

    @Test
    void getStats_topCocktails_listeVide_retourneListeVide() {
        given(commandeRepository.findTopCocktails(any())).willReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.topCocktails()).isEmpty();
    }

    // ─── stock critique ───────────────────────────────────────────────────────

    @Test
    void getStats_stockIngredientsCritiques_retourneCompteSousSeuil() {
        given(ingredientRepository.countIngredientsSousSeuil()).willReturn(3L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.stockIngredientsCritiques()).isEqualTo(3L);
    }

    @Test
    void getStats_aucunStockCritique_retourneZero() {
        given(ingredientRepository.countIngredientsSousSeuil()).willReturn(0L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.stockIngredientsCritiques()).isZero();
    }

    // ─── cohérence globale du DTO ─────────────────────────────────────────────

    @Test
    void getStats_retourneDtoCompletAvecToutesLesValeurs() {
        given(commandeRepository.count()).willReturn(20L);
        given(commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE)).willReturn(4L);
        given(commandeRepository.countByStatut(CommandeStatut.EN_PREPARATION)).willReturn(3L);
        given(commandeRepository.countByStatut(CommandeStatut.PRET)).willReturn(2L);
        given(commandeRepository.countByStatut(CommandeStatut.LIVREE)).willReturn(11L);
        given(commandeRepository.sumTotalByStatutAndDateCommandeAfter(eq(CommandeStatut.REGLEE), any()))
                .willReturn(new BigDecimal("200.00"), new BigDecimal("1500.00"));
        given(tableRepository.countByOccupeeTrue()).willReturn(3L);
        given(tableRepository.count()).willReturn(8L);
        given(commandeRepository.findTopCocktails(any()))
                .willReturn(List.of(new TopCocktailDTO(1L, "Spritz", 10L)));
        given(ingredientRepository.countIngredientsSousSeuil()).willReturn(1L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesTotales()).isEqualTo(20L);
        assertThat(stats.commandesEnAttente()).isEqualTo(4L);
        assertThat(stats.commandesEnPreparation()).isEqualTo(3L);
        assertThat(stats.commandesPret()).isEqualTo(2L);
        assertThat(stats.commandesLivrees()).isEqualTo(11L);
        assertThat(stats.chiffreAffairesJour()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(stats.chiffreAffairesMois()).isEqualByComparingTo(new BigDecimal("1500.00"));
        assertThat(stats.tablesOccupees()).isEqualTo(3L);
        assertThat(stats.tablesTotales()).isEqualTo(8L);
        assertThat(stats.topCocktails()).hasSize(1);
        assertThat(stats.stockIngredientsCritiques()).isEqualTo(1L);
    }

    // ─── base de données vide ─────────────────────────────────────────────────

    @Test
    void getStats_baseVide_retourneToutAZero() {
        // stubs déjà positionnés à 0 dans setUp()

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.commandesTotales()).isZero();
        assertThat(stats.commandesEnAttente()).isZero();
        assertThat(stats.commandesEnPreparation()).isZero();
        assertThat(stats.commandesPret()).isZero();
        assertThat(stats.commandesLivrees()).isZero();
        assertThat(stats.chiffreAffairesJour()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(stats.chiffreAffairesMois()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(stats.tablesOccupees()).isZero();
        assertThat(stats.tablesTotales()).isZero();
        assertThat(stats.topCocktails()).isEmpty();
        assertThat(stats.stockIngredientsCritiques()).isZero();
    }
}
