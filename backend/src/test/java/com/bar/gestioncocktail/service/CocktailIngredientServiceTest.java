package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CocktailIngredientServiceTest {

    @Mock
    CocktailIngredientRepository cocktailIngredientRepository;

    @InjectMocks
    CocktailIngredientService cocktailIngredientService;

    private Cocktail cocktail;
    private Ingredient ingredient;
    private CocktailIngredient cocktailIngredient;

    @BeforeEach
    void setUp() {
        cocktail = new Cocktail();
        cocktail.setId(1L);

        ingredient = new Ingredient();
        ingredient.setId(1L);
        ingredient.setNom("Rhum");

        cocktailIngredient = new CocktailIngredient();
        cocktailIngredient.setId(1L);
        cocktailIngredient.setCocktail(cocktail);
        cocktailIngredient.setIngredient(ingredient);
        cocktailIngredient.setQuantite(new BigDecimal("4.00"));
        cocktailIngredient.setNotes("4 cl de rhum blanc");
    }

    // ─── createCocktailIngredient ─────────────────────────────────────────────

    @Test
    void createCocktailIngredient_nominal_retourneEntiteSauvegardee() {
        given(cocktailIngredientRepository.save(cocktailIngredient)).willReturn(cocktailIngredient);

        CocktailIngredient result = cocktailIngredientService.createCocktailIngredient(cocktailIngredient);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getQuantite()).isEqualByComparingTo(new BigDecimal("4.00"));
        verify(cocktailIngredientRepository).save(cocktailIngredient);
    }

    @Test
    void createCocktailIngredient_sansNotes_sauvegardeSansErreur() {
        cocktailIngredient.setNotes(null);
        given(cocktailIngredientRepository.save(cocktailIngredient)).willReturn(cocktailIngredient);

        CocktailIngredient result = cocktailIngredientService.createCocktailIngredient(cocktailIngredient);

        assertThat(result.getNotes()).isNull();
        verify(cocktailIngredientRepository).save(cocktailIngredient);
    }

    // ─── getCocktailIngredientById ────────────────────────────────────────────

    @Test
    void getCocktailIngredientById_existant_retourneOptionalAvecEntite() {
        given(cocktailIngredientRepository.findById(1L)).willReturn(Optional.of(cocktailIngredient));

        Optional<CocktailIngredient> result = cocktailIngredientService.getCocktailIngredientById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(1L);
    }

    @Test
    void getCocktailIngredientById_inexistant_retourneOptionalVide() {
        given(cocktailIngredientRepository.findById(99L)).willReturn(Optional.empty());

        Optional<CocktailIngredient> result = cocktailIngredientService.getCocktailIngredientById(99L);

        assertThat(result).isEmpty();
    }

    // ─── getIngredientsByCocktail ─────────────────────────────────────────────

    @Test
    void getIngredientsByCocktail_cocktailAvecIngredients_retourneListe() {
        CocktailIngredient autre = new CocktailIngredient();
        autre.setId(2L);
        autre.setCocktail(cocktail);
        Ingredient citron = new Ingredient();
        citron.setId(2L);
        citron.setNom("Citron");
        autre.setIngredient(citron);
        autre.setQuantite(new BigDecimal("2.00"));

        given(cocktailIngredientRepository.findByCocktail(cocktail))
                .willReturn(List.of(cocktailIngredient, autre));

        List<CocktailIngredient> result = cocktailIngredientService.getIngredientsByCocktail(cocktail);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(ci -> ci.getIngredient().getNom())
                .containsExactlyInAnyOrder("Rhum", "Citron");
    }

    @Test
    void getIngredientsByCocktail_cocktailSansIngredients_retourneListeVide() {
        given(cocktailIngredientRepository.findByCocktail(cocktail)).willReturn(List.of());

        List<CocktailIngredient> result = cocktailIngredientService.getIngredientsByCocktail(cocktail);

        assertThat(result).isEmpty();
    }

    // ─── getCocktailsByIngredient ─────────────────────────────────────────────

    @Test
    void getCocktailsByIngredient_ingredientPresent_retourneListe() {
        given(cocktailIngredientRepository.findByIngredient(ingredient))
                .willReturn(List.of(cocktailIngredient));

        List<CocktailIngredient> result = cocktailIngredientService.getCocktailsByIngredient(ingredient);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCocktail().getId()).isEqualTo(1L);
    }

    @Test
    void getCocktailsByIngredient_ingredientNonUtilise_retourneListeVide() {
        Ingredient ingredientRare = new Ingredient();
        ingredientRare.setId(99L);
        ingredientRare.setNom("Truffe noire");

        given(cocktailIngredientRepository.findByIngredient(ingredientRare)).willReturn(List.of());

        List<CocktailIngredient> result = cocktailIngredientService.getCocktailsByIngredient(ingredientRare);

        assertThat(result).isEmpty();
    }

    // ─── updateQuantite ───────────────────────────────────────────────────────

    @Test
    void updateQuantite_nominal_modifieEtSauvegarde() {
        BigDecimal nouvelleQuantite = new BigDecimal("6.00");

        cocktailIngredientService.updateQuantite(cocktailIngredient, nouvelleQuantite);

        assertThat(cocktailIngredient.getQuantite()).isEqualByComparingTo(nouvelleQuantite);
        verify(cocktailIngredientRepository).save(cocktailIngredient);
    }

    @Test
    void updateQuantite_quantiteZero_sauvegardeSansErreur() {
        BigDecimal zero = BigDecimal.ZERO;

        cocktailIngredientService.updateQuantite(cocktailIngredient, zero);

        assertThat(cocktailIngredient.getQuantite()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(cocktailIngredientRepository).save(cocktailIngredient);
    }

    // ─── deleteCocktailIngredient(Long) ───────────────────────────────────────

    @Test
    void deleteCocktailIngredient_parId_appelleDeleteById() {
        cocktailIngredientService.deleteCocktailIngredient(1L);

        verify(cocktailIngredientRepository).deleteById(1L);
    }

    @Test
    void deleteCocktailIngredient_idInexistant_neLeveAucuneException() {
        doNothing().when(cocktailIngredientRepository).deleteById(99L);

        // Should not throw — JpaRepository.deleteById() is a no-op when ID is absent
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
                () -> cocktailIngredientService.deleteCocktailIngredient(99L)
        );
        verify(cocktailIngredientRepository).deleteById(99L);
    }

    // ─── deleteCocktailIngredient(Cocktail, Ingredient) ──────────────────────

    @Test
    void deleteCocktailIngredient_parCocktailEtIngredient_appelleDeleteByCocktailAndIngredient() {
        cocktailIngredientService.deleteCocktailIngredient(cocktail, ingredient);

        verify(cocktailIngredientRepository).deleteByCocktailAndIngredient(cocktail, ingredient);
    }

    @Test
    void deleteCocktailIngredient_parCocktailEtIngredient_nAppelleJamaisDeleteById() {
        cocktailIngredientService.deleteCocktailIngredient(cocktail, ingredient);

        verify(cocktailIngredientRepository, never()).deleteById(any());
    }
}
