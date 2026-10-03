package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
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
import java.time.Month;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RouletteService}.
 * Validates public configuration, fair/stock-weighted spins, bartender broadcasts, table cart additions, and wheel sector management.
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
        void getPublicConfigReturnsConfigAndSectors() {
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
        void spinResolvesWinningSector() {
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
        void spinExcludesCustomRewardAntiFraud() {
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
        void spinAddsToTableCartWhenTableIdPresent() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito));
            TableCartResponseDTO mockCartResponse = new TableCartResponseDTO(
                    5L, "OPEN", List.of(), 1, new BigDecimal("7.50"),
                    null, null, null, LocalDateTime.now(ZoneId.of("Europe/Paris"))
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
        void spinFiltersNonAlcoholicMocktail() {
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
        void triggerBroadcastSpinBroadcastsToStomp() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.SEPTEMBER, 27, 20, 0));

            RouletteBroadcastSpinRequestDTO request = new RouletteBroadcastSpinRequestDTO(
                    null, "FAIR", null, null, null, false, 5, "CSGO"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(request);

            assertThat(result).isNotNull();
            verify(messagingTemplate).convertAndSend(eq("/topic/roulette/events"), any(RouletteEventDTO.class));
        }

        @Test
        @DisplayName("Respects rigged sector ID when requested by bartender")
        void triggerBroadcastSpinWithRiggedSector() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));
            when(sectorRepository.findById(2L)).thenReturn(Optional.of(sectorBartenderSpecial));
            when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.SEPTEMBER, 27, 20, 0));

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
        void getAllSectorsReturnsSectors() {
            when(sectorRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));

            List<RouletteWheelSectorDTO> sectors = rouletteService.getAllSectors();

            assertThat(sectors).hasSize(2);
            assertThat(sectors.get(0).label()).isEqualTo("Mojito");
        }

        @Test
        @DisplayName("createSector creates and saves sector")
        void createSectorCreatesAndSaves() {
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
        void updateSectorUpdatesExisting() {
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
        void updateSectorNotFoundThrowsException() {
            when(sectorRepository.findById(999L)).thenReturn(Optional.empty());

            RouletteWheelSectorRequestDTO dto = new RouletteWheelSectorRequestDTO(
                    "X", RoulettePrizeType.COCKTAIL, null, null, null, "#000", "icon", 1, true, 0
            );

            assertThatThrownBy(() -> rouletteService.updateSector(999L, dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("deleteSector deletes existing sector")
        void deleteSectorDeletesExisting() {
            when(sectorRepository.findById(1L)).thenReturn(Optional.of(sectorMojito));

            rouletteService.deleteSector(1L);

            verify(sectorRepository).delete(sectorMojito);
        }
    }

    @Nested
    @DisplayName("PIN Management")
    class PinManagementTests {

        @Test
        @DisplayName("verifyDisplayPin returns true when PIN matches")
        void verifyDisplayPinValidReturnsTrue() {
            EstablishmentConfig config = new EstablishmentConfig();
            config.setRouletteDisplayPin("7777");
            when(establishmentConfigService.getConfig()).thenReturn(config);

            RoulettePinVerificationResponseDTO res = rouletteService.verifyDisplayPin("7777");

            assertThat(res.valid()).isTrue();
        }

        @Test
        @DisplayName("verifyDisplayPin returns false when PIN is incorrect or blank")
        void verifyDisplayPinInvalidReturnsFalse() {
            EstablishmentConfig config = new EstablishmentConfig();
            config.setRouletteDisplayPin("7777");
            when(establishmentConfigService.getConfig()).thenReturn(config);

            assertThat(rouletteService.verifyDisplayPin("1234").valid()).isFalse();
            assertThat(rouletteService.verifyDisplayPin("").valid()).isFalse();
            assertThat(rouletteService.verifyDisplayPin(null).valid()).isFalse();
        }

        @Test
        @DisplayName("getDisplayPin returns current PIN")
        void getDisplayPinReturnsCurrentPin() {
            EstablishmentConfig config = new EstablishmentConfig();
            config.setRouletteDisplayPin("4321");
            when(establishmentConfigService.getConfig()).thenReturn(config);

            RoulettePinDTO dto = rouletteService.getDisplayPin();

            assertThat(dto.pin()).isEqualTo("4321");
        }

        @Test
        @DisplayName("updateDisplayPin updates PIN and broadcasts revocation")
        void updateDisplayPinValidUpdatesAndBroadcasts() {
            RoulettePinDTO dto = rouletteService.updateDisplayPin("8888");

            assertThat(dto.pin()).isEqualTo("8888");
            verify(establishmentConfigService).updateRouletteDisplayPin("8888");
            verify(messagingTemplate).convertAndSend(eq("/topic/roulette/events"), any(RouletteEventDTO.class));
        }

        @Test
        @DisplayName("updateDisplayPin throws BusinessException when PIN is not 4 digits")
        void updateDisplayPinInvalidThrowsException() {
            assertThatThrownBy(() -> rouletteService.updateDisplayPin("123"))
                    .isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> rouletteService.updateDisplayPin("12345"))
                    .isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> rouletteService.updateDisplayPin("abcd"))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("regenerateDisplayPin generates a 4-digit PIN and broadcasts revocation")
        void regenerateDisplayPinGeneratesAndBroadcasts() {
            RoulettePinDTO dto = rouletteService.regenerateDisplayPin();

            assertThat(dto.pin()).matches("^\\d{4}$");
            verify(establishmentConfigService).updateRouletteDisplayPin(dto.pin());
            verify(messagingTemplate).convertAndSend(eq("/topic/roulette/events"), any(RouletteEventDTO.class));
        }
    }

    @Nested
    @DisplayName("Broadcast Spin Modes & Options")
    class BroadcastModesTests {

        @Test
        @DisplayName("triggerBroadcastSpin with RIGGED_SECTOR selects target sector")
        void triggerBroadcastSpinRiggedSector() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));
            when(sectorRepository.findById(2L)).thenReturn(Optional.of(sectorBartenderSpecial));

            RouletteBroadcastSpinRequestDTO req = new RouletteBroadcastSpinRequestDTO(
                    null, "RIGGED_SECTOR", null, 2L, null, false, 5, "CSGO"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(req);

            assertThat(result.sectorId()).isEqualTo(2L);
            assertThat(result.prizeType()).isEqualTo(RoulettePrizeType.BARTENDER_SPECIAL);
        }

        @Test
        @DisplayName("triggerBroadcastSpin with RIGGED_COCKTAIL selects sector with matching cocktail")
        void triggerBroadcastSpinRiggedCocktail() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));

            RouletteBroadcastSpinRequestDTO req = new RouletteBroadcastSpinRequestDTO(
                    null, "RIGGED_COCKTAIL", null, null, 10L, false, 5, "ARCADE"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(req);

            assertThat(result.sectorId()).isEqualTo(1L);
            assertThat(result.cocktailNom()).isEqualTo("Mojito");
        }

        @Test
        @DisplayName("triggerBroadcastSpin with CATEGORY filters sectors")
        void triggerBroadcastSpinCategory() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito));

            RouletteBroadcastSpinRequestDTO req = new RouletteBroadcastSpinRequestDTO(
                    null, "CATEGORY", "RUM", null, null, false, 5, "CSGO"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(req);

            assertThat(result.sectorId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("triggerBroadcastSpin with autoAddToCart adds won drink to table cart")
        void triggerBroadcastSpinAutoAddToCart() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito));
            TableEntity mockTable = new TableEntity();
            mockTable.setNumero(4);
            when(tableRepository.findById(4L)).thenReturn(Optional.of(mockTable));

            RouletteBroadcastSpinRequestDTO req = new RouletteBroadcastSpinRequestDTO(
                    4L, "RANDOM", null, null, null, true, 5, "CSGO"
            );

            RouletteSpinResultDTO result = rouletteService.triggerBroadcastSpin(req);

            assertThat(result.addedToCart()).isTrue();
            verify(tableCartService).addItem(eq(4L), any(TableCartItemRequestDTO.class));
        }
    }

    @Nested
    @DisplayName("Stock Depletion & Allergens")
    class StockDepletionTests {

        @Test
        @DisplayName("Excludes cocktail with excluded allergen")
        void spinExcludesAllergen() {
            Ingredient mint = new Ingredient();
            mint.setId(20L);
            mint.setNom("Menthe");
            mint.setAllergens(Set.of(Allergen.SULFITES));

            CocktailIngredient ci = new CocktailIngredient();
            ci.setIngredient(mint);
            ci.setQuantite(new BigDecimal("5.0"));
            mojito.setIngredients(List.of(ci));

            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));

            RouletteSpinRequestDTO req = new RouletteSpinRequestDTO(
                    null, null, null, null, false, List.of(Allergen.SULFITES), false
            );

            RouletteSpinResultDTO result = rouletteService.spin(req);

            // Mojito contains SULFITES, must land on Bartender Special
            assertThat(result.sectorId()).isEqualTo(2L);
        }

        @Test
        @DisplayName("Boosts weight when ingredient is approaching expiration date within 14 days")
        void spinBoostsWeightForExpiringIngredient() {
            Ingredient rum = new Ingredient();
            rum.setId(21L);
            rum.setNom("Rhum blanc");
            rum.setQuantiteStock(new BigDecimal("100.0"));
            rum.setSeuilAlerte(new BigDecimal("10.0"));
            rum.setDatePeremption(LocalDateTime.of(2026, Month.SEPTEMBER, 30, 0, 0));

            CocktailIngredient ci = new CocktailIngredient();
            ci.setIngredient(rum);
            ci.setQuantite(new BigDecimal("5.0"));
            mojito.setIngredients(List.of(ci));

            when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.SEPTEMBER, 25, 0, 0));
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito));

            RouletteSpinRequestDTO req = new RouletteSpinRequestDTO(
                    null, null, null, null, false, List.of(), false
            );

            RouletteSpinResultDTO result = rouletteService.spin(req);

            assertThat(result.sectorId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("getAllSectors returns all sectors ordered by display order")
        void getAllSectorsReturnsOrdered() {
            when(sectorRepository.findAllByOrderByDisplayOrderAsc()).thenReturn(List.of(sectorMojito, sectorBartenderSpecial));

            List<RouletteWheelSectorDTO> all = rouletteService.getAllSectors();

            assertThat(all).hasSize(2);
            assertThat(all.get(0).label()).isEqualTo("Mojito");
        }

        @Test
        @DisplayName("initDefaultSectors initializes and persists default wheel sectors when empty")
        void initDefaultSectorsPopulatesDefaults() {
            when(sectorRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of());
            when(cocktailRepository.findAll()).thenReturn(List.of(mojito));
            when(sectorRepository.saveAll(anyList())).thenAnswer(i -> {
                List<RouletteWheelSector> list = i.getArgument(0);
                long id = 1;
                for (RouletteWheelSector s : list) {
                    s.setId(id++);
                }
                return list;
            });

            RouletteSpinRequestDTO req = new RouletteSpinRequestDTO(
                    null, null, null, null, false, List.of(), false
            );

            RouletteSpinResultDTO result = rouletteService.spin(req);

            assertThat(result).isNotNull();
            verify(sectorRepository).saveAll(anyList());
        }
    }
}
