package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.RouletteWheelSectorRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RouletteService}.
 * Validates public configuration, fair/stock-weighted spins, bartender broadcasts, and wheel sector management.
 */
@ExtendWith(MockitoExtension.class)
class RouletteServiceTest {

    @Mock
    private RouletteWheelSectorRepository sectorRepository;

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private TableCartService tableCartService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private RouletteService rouletteService;

    private Cocktail mojito;
    private Cocktail virginMojito;
    private RouletteWheelSector sectorMojito;
    private RouletteWheelSector sectorBartenderSpecial;
    private EstablishmentConfig establishmentConfig;

    @BeforeEach
    void setUp() {
        mojito = new Cocktail();
        mojito.setId(10L);
        mojito.setNom("Mojito");
        mojito.setPrix(new BigDecimal("9.50"));
        mojito.setCategorie(CocktailCategorie.ALCOOLISE);
        mojito.setAlcoholLevel(new BigDecimal("12.5"));
        mojito.setDisponible(true);

        virginMojito = new Cocktail();
        virginMojito.setId(11L);
        virginMojito.setNom("Virgin Mojito");
        virginMojito.setPrix(new BigDecimal("6.50"));
        virginMojito.setCategorie(CocktailCategorie.SANS_ALCOOL);
        virginMojito.setIsMocktail(true);
        virginMojito.setAlcoholLevel(BigDecimal.ZERO);
        virginMojito.setDisponible(true);

        sectorMojito = new RouletteWheelSector();
        sectorMojito.setId(1L);
        sectorMojito.setLabel("Mojito");
        sectorMojito.setPrizeType(RoulettePrizeType.COCKTAIL);
        sectorMojito.setCocktail(mojito);
        sectorMojito.setColorHex("#10b981");
        sectorMojito.setIconName("leaf-outline");
        sectorMojito.setProbabilityWeight(2);
        sectorMojito.setActive(true);
        sectorMojito.setDisplayOrder(0);

        sectorBartenderSpecial = new RouletteWheelSector();
        sectorBartenderSpecial.setId(2L);
        sectorBartenderSpecial.setLabel("Création Barman");
        sectorBartenderSpecial.setPrizeType(RoulettePrizeType.BARTENDER_SPECIAL);
        sectorBartenderSpecial.setColorHex("#f59e0b");
        sectorBartenderSpecial.setIconName("sparkles-outline");
        sectorBartenderSpecial.setProbabilityWeight(1);
        sectorBartenderSpecial.setActive(true);
        sectorBartenderSpecial.setDisplayOrder(1);

        establishmentConfig = new EstablishmentConfig();
        establishmentConfig.setRoulettePriceCocktail(new BigDecimal("7.50"));
        establishmentConfig.setRoulettePriceMocktail(new BigDecimal("5.50"));
        establishmentConfig.setRouletteStockBias("BALANCED");
        establishmentConfig.setRouletteSoundProfile("CSGO");
    }

    @Nested
    @DisplayName("getPublicConfig")
    class GetPublicConfigTests {

        @Test
        @DisplayName("Returns public configuration with active sectors and pricing")
        void getPublicConfig_returnsConfigAndSectors() {
            when(establishmentConfigService.isModuleEnabled(EstablishmentModule.MYSTERY_ROULETTE)).thenReturn(true);
            when(establishmentConfigService.getConfig()).thenReturn(establishmentConfig);
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));

            RoulettePublicConfigDTO config = rouletteService.getPublicConfig();

            assertThat(config.enabled()).isTrue();
            assertThat(config.priceCocktail()).isEqualByComparingTo("7.50");
            assertThat(config.priceMocktail()).isEqualByComparingTo("5.50");
            assertThat(config.sectors()).hasSize(2);
            assertThat(config.sectors().get(0).label()).isEqualTo("Mojito");
        }
    }

    @Nested
    @DisplayName("spin")
    class SpinTests {

        @Test
        @DisplayName("Spins successfully and resolves winning sector")
        void spin_resolvesWinningSector() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito));

            RouletteSpinRequestDTO request = new RouletteSpinRequestDTO(
                    null, null, null, null, false, List.of(), false
            );

            RouletteSpinResultDTO result = rouletteService.spin(request);

            assertThat(result).isNotNull();
            assertThat(result.sectorId()).isEqualTo(1L);
            assertThat(result.cocktailNom()).isEqualTo("Mojito");
            assertThat(result.prix()).isEqualByComparingTo("9.50");
            assertThat(result.addedToCart()).isFalse();
        }

        @Test
        @DisplayName("Excludes CUSTOM_REWARD from client spins to prevent indefinite re-roll fraud")
        void spin_excludesCustomReward_antiFraud() {
            RouletteWheelSector customReward = new RouletteWheelSector();
            customReward.setId(99L);
            customReward.setLabel("Free Shooter Gift");
            customReward.setPrizeType(RoulettePrizeType.CUSTOM_REWARD);
            customReward.setActive(true);
            customReward.setProbabilityWeight(10);

            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(customReward, sectorMojito));

            RouletteSpinRequestDTO request = new RouletteSpinRequestDTO(
                    null, null, null, null, false, List.of(), false
            );

            RouletteSpinResultDTO result = rouletteService.spin(request);

            // Winning sector must be Mojito, never the free custom reward
            assertThat(result.sectorId()).isEqualTo(1L);
            assertThat(result.prix()).isEqualByComparingTo("9.50");
        }

        @Test
        @DisplayName("Spins and adds to table cart when tableId is provided")
        void spin_addsToTableCartWhenTableIdPresent() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito));
            TableCartResponseDTO mockCartResponse = new TableCartResponseDTO(
                    5L, "OPEN", List.of(), 1, new BigDecimal("7.50"),
                    null, null, null, LocalDateTime.now()
            );
            when(tableCartService.addItem(eq(5L), any(TableCartItemRequestDTO.class))).thenReturn(mockCartResponse);

            RouletteSpinRequestDTO request = new RouletteSpinRequestDTO(
                    5L, "sess-1", "Alice", null, false, List.of(), true
            );

            RouletteSpinResultDTO result = rouletteService.spin(request);

            assertThat(result.addedToCart()).isTrue();
            verify(tableCartService).addItem(eq(5L), any(TableCartItemRequestDTO.class));
        }

        @Test
        @DisplayName("Filters by non-alcoholic mocktail when requested")
        void spin_filtersNonAlcoholicMocktail() {
            RouletteWheelSector sectorVirgin = new RouletteWheelSector();
            sectorVirgin.setId(3L);
            sectorVirgin.setLabel("Virgin Mojito");
            sectorVirgin.setPrizeType(RoulettePrizeType.COCKTAIL);
            sectorVirgin.setCocktail(virginMojito);
            sectorVirgin.setProbabilityWeight(2);
            sectorVirgin.setActive(true);

            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorVirgin));

            RouletteSpinRequestDTO request = new RouletteSpinRequestDTO(
                    null, null, null, "MOCKTAIL", true, List.of(), false
            );

            RouletteSpinResultDTO result = rouletteService.spin(request);

            assertThat(result.sectorId()).isEqualTo(3L);
            assertThat(result.cocktailNom()).isEqualTo("Virgin Mojito");
        }
    }

    @Nested
    @DisplayName("triggerBroadcastSpin")
    class TriggerBroadcastSpinTests {

        @Test
        @DisplayName("Broadcasts live spin event to STOMP topic")
        void triggerBroadcastSpin_broadcastsToStomp() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, 9, 27, 20, 0));

            RouletteBroadcastSpinRequestDTO request = new RouletteBroadcastSpinRequestDTO(
                    null, "FAIR", null, null, null, false, 5, "CSGO"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(request);

            assertThat(result).isNotNull();
            verify(messagingTemplate).convertAndSend(eq("/topic/roulette/events"), any(RouletteEventDTO.class));
        }

        @Test
        @DisplayName("Respects rigged sector ID when requested by bartender")
        void triggerBroadcastSpin_withRiggedSector() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));
            when(sectorRepository.findById(2L)).thenReturn(Optional.of(sectorBartenderSpecial));
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, 9, 27, 20, 0));

            RouletteBroadcastSpinRequestDTO request = new RouletteBroadcastSpinRequestDTO(
                    null, "RIGGED_SECTOR", null, 2L, null, false, 5, "CSGO"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(request);

            assertThat(result.sectorId()).isEqualTo(2L);
            assertThat(result.cocktailNom()).isEqualTo("Création Barman");
        }
    }

    @Nested
    @DisplayName("Wheel Sectors CRUD")
    class SectorsCrudTests {

        @Test
        @DisplayName("getAllSectors returns all sectors ordered by displayOrder")
        void getAllSectors_returnsSectors() {
            when(sectorRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));

            List<RouletteWheelSectorDTO> sectors = rouletteService.getAllSectors();

            assertThat(sectors).hasSize(2);
            assertThat(sectors.get(0).label()).isEqualTo("Mojito");
        }

        @Test
        @DisplayName("createSector creates and saves sector")
        void createSector_createsAndSaves() {
            RouletteWheelSectorRequestDTO dto = new RouletteWheelSectorRequestDTO(
                    "Cosmopolitan", RoulettePrizeType.COCKTAIL, 10L, null,
                    new BigDecimal("8.00"), "#ec4899", "wine-outline", 2, true, 3
            );
            when(cocktailRepository.findById(10L)).thenReturn(Optional.of(mojito));
            when(sectorRepository.save(any(RouletteWheelSector.class))).thenAnswer(invocation -> {
                RouletteWheelSector saved = invocation.getArgument(0);
                saved.setId(99L);
                return saved;
            });

            RouletteWheelSectorDTO created = rouletteService.createSector(dto);

            assertThat(created.id()).isEqualTo(99L);
            assertThat(created.label()).isEqualTo("Cosmopolitan");
            verify(sectorRepository).save(any(RouletteWheelSector.class));
        }

        @Test
        @DisplayName("updateSector updates existing sector")
        void updateSector_updatesExisting() {
            when(sectorRepository.findById(1L)).thenReturn(Optional.of(sectorMojito));
            when(cocktailRepository.findById(10L)).thenReturn(Optional.of(mojito));
            when(sectorRepository.save(any(RouletteWheelSector.class))).thenAnswer(i -> i.getArgument(0));

            RouletteWheelSectorRequestDTO dto = new RouletteWheelSectorRequestDTO(
                    "Mojito Royal", RoulettePrizeType.COCKTAIL, 10L, null,
                    new BigDecimal("10.00"), "#10b981", "leaf-outline", 3, true, 0
            );

            RouletteWheelSectorDTO updated = rouletteService.updateSector(1L, dto);

            assertThat(updated.label()).isEqualTo("Mojito Royal");
        }

        @Test
        @DisplayName("updateSector throws ResourceNotFoundException when sector missing")
        void updateSector_notFoundThrowsException() {
            when(sectorRepository.findById(999L)).thenReturn(Optional.empty());

            RouletteWheelSectorRequestDTO dto = new RouletteWheelSectorRequestDTO(
                    "X", RoulettePrizeType.COCKTAIL, null, null, null, "#000", "icon", 1, true, 0
            );

            assertThatThrownBy(() -> rouletteService.updateSector(999L, dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("deleteSector deletes existing sector")
        void deleteSector_deletesExisting() {
            when(sectorRepository.findById(1L)).thenReturn(Optional.of(sectorMojito));

            rouletteService.deleteSector(1L);

            verify(sectorRepository).delete(sectorMojito);
        }
    }
}
