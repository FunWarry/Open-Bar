package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Glassware;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link GlasswareDataSeederService}.
 */
@ExtendWith(MockitoExtension.class)
class GlasswareDataSeederServiceTest {

    @Mock
    private GlasswareRepository glasswareRepository;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private GlasswareDataSeederService glasswareDataSeederService;

    @BeforeEach
    void setUp() {
        lenient().when(timeService.now()).thenReturn(LocalDateTime.of(2026, 8, 20, 1, 0));
    }

    @Test
    @DisplayName("seedGlasswareIfEmpty - seeds 9 standard glassware items when repository is empty")
    void seedGlasswareIfEmpty_seedsPredefinedItemsWhenEmpty() {
        when(glasswareRepository.count()).thenReturn(0L);

        glasswareDataSeederService.seedGlasswareIfEmpty();

        ArgumentCaptor<Iterable<Glassware>> captor = ArgumentCaptor.captor();
        verify(glasswareRepository, times(1)).saveAll(captor.capture());

        Iterable<Glassware> savedIterable = captor.getValue();
        List<String> names = new java.util.ArrayList<>();
        int count = 0;
        boolean allPredefined = true;
        for (Glassware g : savedIterable) {
            count++;
            names.add(g.getNom());
            if (!g.isPredefined()) {
                allPredefined = false;
            }
        }

        assertThat(count).isEqualTo(9);
        assertThat(names).contains(
                "Verre Tumbler / Highball",
                "Verre Old Fashioned / Rocks",
                "Coupe à Cocktail / Martini",
                "Verre Margarita",
                "Verre Ballon / Copa",
                "Flûte à Champagne",
                "Tasse en cuivre",
                "Verre Tiki",
                "Verre à Shot / Chupito"
        );
        assertThat(allPredefined).isTrue();
    }

    @Test
    @DisplayName("seedGlasswareIfEmpty - skips seeding when repository already contains items")
    void seedGlasswareIfEmpty_skipsWhenAlreadyPopulated() {
        when(glasswareRepository.count()).thenReturn(9L);

        glasswareDataSeederService.seedGlasswareIfEmpty();

        verify(glasswareRepository, never()).saveAll(any());
    }
}
