package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CocktailVarianteServiceTest {

    @Mock
    CocktailVarianteRepository cocktailVarianteRepository;

    @InjectMocks
    CocktailVarianteService cocktailVarianteService;

    private Cocktail cocktail;
    private CocktailVariante variante;

    @BeforeEach
    void setUp() {
        cocktail = new Cocktail();
        cocktail.setId(1L);

        variante = new CocktailVariante();
        variante.setId(1L);
        variante.setCocktail(cocktail);
        variante.setNom("Sans alcool");
        variante.setDescription("Version sans alcool du cocktail");
        variante.setPrixSupplement(new BigDecimal("0.00"));
        variante.setDisponible(true);
        variante.setInstructions("Remplacer l'alcool par du sirop");

        given(cocktailVarianteRepository.save(any(CocktailVariante.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ─── createCocktailVariante ────────────────────────────────────────────────

    @Test
    void createCocktailVariante_nominal_setsCreatedAtAndUpdatedAt() {
        variante.setCreatedAt(null);
        variante.setUpdatedAt(null);

        CocktailVariante result = cocktailVarianteService.createCocktailVariante(variante);

        assertThat(result.getCreatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
    }

    @Test
    void createCocktailVariante_nominal_delegatesAuRepository() {
        cocktailVarianteService.createCocktailVariante(variante);

        verify(cocktailVarianteRepository, times(1)).save(variante);
    }

    @Test
    void createCocktailVariante_nominal_retourneVarianteSauvegardee() {
        CocktailVariante result = cocktailVarianteService.createCocktailVariante(variante);

        assertThat(result).isSameAs(variante);
        assertThat(result.getNom()).isEqualTo("Sans alcool");
    }

    // ─── updateCocktailVariante ────────────────────────────────────────────────

    @Test
    void updateCocktailVariante_nominal_setsUpdatedAt() {
        variante.setUpdatedAt(null);

        CocktailVariante result = cocktailVarianteService.updateCocktailVariante(variante);

        assertThat(result.getUpdatedAt()).isNotNull();
    }

    @Test
    void updateCocktailVariante_nominal_delegatesAuRepository() {
        cocktailVarianteService.updateCocktailVariante(variante);

        verify(cocktailVarianteRepository, times(1)).save(variante);
    }

    @Test
    void updateCocktailVariante_nominal_neModifiePasCreatedAt() {
        variante.setCreatedAt(null);

        CocktailVariante result = cocktailVarianteService.updateCocktailVariante(variante);

        // updateCocktailVariante ne touche pas createdAt
        assertThat(result.getCreatedAt()).isNull();
    }

    // ─── deleteCocktailVariante ────────────────────────────────────────────────

    @Test
    void deleteCocktailVariante_nominal_appelleDeleteById() {
        doNothing().when(cocktailVarianteRepository).deleteById(1L);

        cocktailVarianteService.deleteCocktailVariante(1L);

        verify(cocktailVarianteRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteCocktailVariante_idInexistant_nepasLeverException() {
        doNothing().when(cocktailVarianteRepository).deleteById(99L);

        // Le service délègue directement sans vérification — pas d'exception attendue
        cocktailVarianteService.deleteCocktailVariante(99L);

        verify(cocktailVarianteRepository).deleteById(99L);
    }

    // ─── getCocktailVarianteById ───────────────────────────────────────────────

    @Test
    void getCocktailVarianteById_existant_retourneOptionalNonVide() {
        given(cocktailVarianteRepository.findById(1L)).willReturn(Optional.of(variante));

        Optional<CocktailVariante> result = cocktailVarianteService.getCocktailVarianteById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(1L);
    }

    @Test
    void getCocktailVarianteById_inexistant_retourneOptionalVide() {
        given(cocktailVarianteRepository.findById(99L)).willReturn(Optional.empty());

        Optional<CocktailVariante> result = cocktailVarianteService.getCocktailVarianteById(99L);

        assertThat(result).isEmpty();
    }

    // ─── getVariantesByCocktail ────────────────────────────────────────────────

    @Test
    void getVariantesByCocktail_avecVariantes_retourneListeComplete() {
        CocktailVariante autreVariante = new CocktailVariante();
        autreVariante.setId(2L);
        autreVariante.setCocktail(cocktail);
        autreVariante.setNom("Double dose");

        given(cocktailVarianteRepository.findByCocktail(cocktail))
                .willReturn(List.of(variante, autreVariante));

        List<CocktailVariante> result = cocktailVarianteService.getVariantesByCocktail(cocktail);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(CocktailVariante::getNom)
                .containsExactlyInAnyOrder("Sans alcool", "Double dose");
    }

    @Test
    void getVariantesByCocktail_sansVariante_retourneListeVide() {
        given(cocktailVarianteRepository.findByCocktail(cocktail)).willReturn(List.of());

        List<CocktailVariante> result = cocktailVarianteService.getVariantesByCocktail(cocktail);

        assertThat(result).isEmpty();
    }

    // ─── getVariantesDisponiblesByCocktail ────────────────────────────────────

    @Test
    void getVariantesDisponiblesByCocktail_filtreSurDisponible_retourneSeulementDisponibles() {
        given(cocktailVarianteRepository.findByCocktailAndDisponible(cocktail, true))
                .willReturn(List.of(variante));

        List<CocktailVariante> result = cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isDisponible()).isTrue();
    }

    @Test
    void getVariantesDisponiblesByCocktail_aucuneDisponible_retourneListeVide() {
        given(cocktailVarianteRepository.findByCocktailAndDisponible(cocktail, true))
                .willReturn(List.of());

        List<CocktailVariante> result = cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail);

        assertThat(result).isEmpty();
    }

    @Test
    void getVariantesDisponiblesByCocktail_passeToujoursDisponibleTrue() {
        given(cocktailVarianteRepository.findByCocktailAndDisponible(any(), eq(true)))
                .willReturn(List.of());

        cocktailVarianteService.getVariantesDisponiblesByCocktail(cocktail);

        verify(cocktailVarianteRepository).findByCocktailAndDisponible(cocktail, true);
        verify(cocktailVarianteRepository, never()).findByCocktailAndDisponible(any(), eq(false));
    }

    // ─── searchVariantes ──────────────────────────────────────────────────────

    @Test
    void searchVariantes_avecResultats_retourneListeCorrespondante() {
        given(cocktailVarianteRepository.findByNomContainingIgnoreCase("sans"))
                .willReturn(List.of(variante));

        List<CocktailVariante> result = cocktailVarianteService.searchVariantes("sans");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Sans alcool");
    }

    @Test
    void searchVariantes_aucunResultat_retourneListeVide() {
        given(cocktailVarianteRepository.findByNomContainingIgnoreCase("inexistant"))
                .willReturn(List.of());

        List<CocktailVariante> result = cocktailVarianteService.searchVariantes("inexistant");

        assertThat(result).isEmpty();
    }

    @Test
    void searchVariantes_delegueIgnoreCaseAuRepository() {
        given(cocktailVarianteRepository.findByNomContainingIgnoreCase("SANS"))
                .willReturn(List.of(variante));

        cocktailVarianteService.searchVariantes("SANS");

        verify(cocktailVarianteRepository).findByNomContainingIgnoreCase("SANS");
    }

    // ─── toggleDisponibilite ──────────────────────────────────────────────────

    @Test
    void toggleDisponibilite_disponibleTrue_passeFalse() {
        variante.setDisponible(true);

        cocktailVarianteService.toggleDisponibilite(variante);

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().isDisponible()).isFalse();
    }

    @Test
    void toggleDisponibilite_disponibleFalse_passeTrue() {
        variante.setDisponible(false);

        cocktailVarianteService.toggleDisponibilite(variante);

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().isDisponible()).isTrue();
    }

    @Test
    void toggleDisponibilite_setsUpdatedAt() {
        variante.setUpdatedAt(null);

        cocktailVarianteService.toggleDisponibilite(variante);

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().getUpdatedAt()).isNotNull();
    }

    // ─── updatePrixSupplement ─────────────────────────────────────────────────

    @Test
    void updatePrixSupplement_nominal_metAJourPrix() {
        BigDecimal nouveauPrix = new BigDecimal("2.50");

        cocktailVarianteService.updatePrixSupplement(variante, nouveauPrix);

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().getPrixSupplement()).isEqualByComparingTo(nouveauPrix);
    }

    @Test
    void updatePrixSupplement_nominal_setsUpdatedAt() {
        variante.setUpdatedAt(null);

        cocktailVarianteService.updatePrixSupplement(variante, new BigDecimal("1.00"));

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().getUpdatedAt()).isNotNull();
    }

    @Test
    void updatePrixSupplement_prixZero_accepteEtSauvegarde() {
        BigDecimal prixZero = BigDecimal.ZERO;

        cocktailVarianteService.updatePrixSupplement(variante, prixZero);

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().getPrixSupplement()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void updatePrixSupplement_prixNull_sauvegardeNullSansBlocage() {
        cocktailVarianteService.updatePrixSupplement(variante, null);

        ArgumentCaptor<CocktailVariante> captor = ArgumentCaptor.forClass(CocktailVariante.class);
        verify(cocktailVarianteRepository).save(captor.capture());
        assertThat(captor.getValue().getPrixSupplement()).isNull();
    }
}
