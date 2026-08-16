package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.repository.CocktailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class CocktailServiceTest {

    @Mock
    CocktailRepository cocktailRepository;

    @Spy
    TimeService timeService = new TimeService(null);

    @Mock
    FileUploadService fileUploadService;

    @InjectMocks
    CocktailService cocktailService;


    private Cocktail cocktail;

    @BeforeEach
    void setUp() {
        cocktail = new Cocktail();
        cocktail.setId(1L);
        cocktail.setNom("Mojito");
        cocktail.setPrix(new BigDecimal("8.50"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail.setDisponible(true);
    }

    @Test
    void getCocktailById_existant_retourneCocktail() {
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));

        Optional<Cocktail> result = cocktailService.getCocktailById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getNom()).isEqualTo("Mojito");
    }

    @Test
    void getCocktailById_inexistant_retourneEmpty() {
        when(cocktailRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<Cocktail> result = cocktailService.getCocktailById(99L);

        assertThat(result).isEmpty();
    }

    @Test
    void createCocktail_sauvegarde_etRetourne() {
        Cocktail nouveau = new Cocktail();
        nouveau.setNom("Margarita");
        nouveau.setPrix(new BigDecimal("9.00"));
        nouveau.setCategorie(CocktailCategorie.ALCOOLISE);

        when(cocktailRepository.save(any(Cocktail.class))).thenReturn(nouveau);

        Cocktail result = cocktailService.createCocktail(nouveau);

        assertThat(result.getNom()).isEqualTo("Margarita");
        verify(cocktailRepository, times(1)).save(nouveau);
    }

    @Test
    void updateCocktail_existant_miseAJour() {
        cocktail.setNom("Mojito Revisited");
        when(cocktailRepository.save(any(Cocktail.class))).thenReturn(cocktail);

        Cocktail result = cocktailService.updateCocktail(cocktail);

        assertThat(result.getNom()).isEqualTo("Mojito Revisited");
        verify(cocktailRepository, times(1)).save(cocktail);
    }

    @Test
    void updateSaisonnalite_cocktailInexistant_throwsResourceNotFoundException() {
        when(cocktailRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cocktailService.updateSaisonnalite(99L, 6, 8))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void deleteCocktail_existant_supprime() {
        cocktailService.deleteCocktail(1L);

        verify(cocktailRepository, times(1)).deleteById(1L);
    }

    @Test
    void toggleDisponibilite_basculeLaValeur() {
        // Cocktail initialement disponible
        assertThat(cocktail.isDisponible()).isTrue();
        when(cocktailRepository.save(any(Cocktail.class))).thenReturn(cocktail);

        cocktailService.toggleDisponibilite(cocktail);

        assertThat(cocktail.isDisponible()).isFalse();
        verify(cocktailRepository, times(1)).save(cocktail);
    }

    @Test
    void getCocktailsDisponibles_filtreSurDisponible() {
        Cocktail indisponible = new Cocktail();
        indisponible.setId(2L);
        indisponible.setNom("Daiquiri");
        indisponible.setDisponible(false);

        when(cocktailRepository.findByDisponible(true)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsDisponibles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Mojito");
        assertThat(result).allMatch(c -> Boolean.TRUE.equals(c.isDisponible()));
    }

    @Test
    void updateCocktailImage_sauvegardePhotoEtMetAJourCocktail() {
        MockMultipartFile file = new MockMultipartFile("file", "mojito.jpg", "image/jpeg", "bytes".getBytes());
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(fileUploadService.storeCocktailPhoto(1L, file)).thenReturn("/uploads/cocktails/cocktail_1_abc.jpg");
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        Cocktail updated = cocktailService.updateCocktailImage(1L, file);

        assertThat(updated.getImageUrl()).isEqualTo("/uploads/cocktails/cocktail_1_abc.jpg");
        verify(fileUploadService, times(1)).storeCocktailPhoto(1L, file);
        verify(cocktailRepository, times(1)).save(cocktail);
    }
}
