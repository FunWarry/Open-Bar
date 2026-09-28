package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.RouletteWheelSectorRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service managing the Cocktail Roulette Wheel experience, stock-weighted drink allocation,
 * bartender remote control, and real-time animation broadcast over STOMP.
 */
@Service
@Transactional
public class RouletteService {

    private static final Logger log = LoggerFactory.getLogger(RouletteService.class);
    private static final String COCKTAIL_NOT_FOUND_MSG = "Cocktail not found with id: ";
    private static final String DEFAULT_ICON = "wine-outline";
    private static final String CATEGORY_MOCKTAIL = "MOCKTAIL";

    private final RouletteWheelSectorRepository sectorRepository;
    private final CocktailRepository cocktailRepository;
    private final TableRepository tableRepository;
    private final TableCartService tableCartService;
    private final EstablishmentConfigService establishmentConfigService;
    private final SimpMessagingTemplate messagingTemplate;
    private final TimeService timeService;
    private final java.security.SecureRandom random = new java.security.SecureRandom();

    /**
     * Constructs the RouletteService with all required dependencies.
     *
     * @param sectorRepository           Wheel sectors repository
     * @param cocktailRepository         Cocktail repository
     * @param tableRepository            Table repository
     * @param tableCartService           Table cart service for adding won drinks
     * @param establishmentConfigService Establishment configuration and feature flags
     * @param messagingTemplate          STOMP messaging template for live broadcasts
     * @param timeService                Application time service
     */
    public RouletteService(
            RouletteWheelSectorRepository sectorRepository,
            CocktailRepository cocktailRepository,
            TableRepository tableRepository,
            TableCartService tableCartService,
            EstablishmentConfigService establishmentConfigService,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService) {
        this.sectorRepository = sectorRepository;
        this.cocktailRepository = cocktailRepository;
        this.tableRepository = tableRepository;
        this.tableCartService = tableCartService;
        this.establishmentConfigService = establishmentConfigService;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
    }

    /**
     * Retrieves the public configuration and active wheel sectors for customer self-ordering.
     *
     * @return Public roulette configuration DTO
     */
    @Transactional(readOnly = true)
    public RoulettePublicConfigDTO getPublicConfig() {
        boolean enabled = establishmentConfigService.isModuleEnabled(EstablishmentModule.MYSTERY_ROULETTE);
        EstablishmentConfig config = establishmentConfigService.getConfig();

        BigDecimal priceCocktail = config.getRoulettePriceCocktail() != null
                ? config.getRoulettePriceCocktail()
                : new BigDecimal("7.50");
        BigDecimal priceMocktail = config.getRoulettePriceMocktail() != null
                ? config.getRoulettePriceMocktail()
                : new BigDecimal("5.50");
        String stockBias = config.getRouletteStockBias() != null
                ? config.getRouletteStockBias()
                : "BALANCED";
        String soundProfile = config.getRouletteSoundProfile() != null
                ? config.getRouletteSoundProfile()
                : "CSGO";

        List<RouletteWheelSector> sectors = getOrInitActiveSectors();

        List<RouletteWheelSectorDTO> sectorDtos = sectors.stream()
                .map(RouletteWheelSectorDTO::from)
                .toList();

        List<String> categories = List.of("ALL", "GIN", "RUM", "VODKA", "WHISKY", "TEQUILA", CATEGORY_MOCKTAIL);

        return new RoulettePublicConfigDTO(
                enabled,
                priceCocktail,
                priceMocktail,
                stockBias,
                soundProfile,
                sectorDtos,
                categories
        );
    }

    /**
     * Resolves a roulette wheel spin according to filters and smart stock depletion weighting.
     *
     * @param request Parameters and dietary filters
     * @return Spin outcome DTO
     */
    public RouletteSpinResultDTO spin(RouletteSpinRequestDTO request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.MYSTERY_ROULETTE);

        List<RouletteWheelSector> activeSectors = getOrInitActiveSectors();

        List<RouletteWheelSector> eligibleSectors = filterEligibleSectors(activeSectors, request);
        if (eligibleSectors.isEmpty()) {
            eligibleSectors = activeSectors;
        }

        RouletteWheelSector winningSector = selectWinningSectorWithStockWeighting(eligibleSectors);
        int winningIndex = findSectorIndex(activeSectors, winningSector.getId());

        BigDecimal winPrice = resolveWinningPrice(winningSector, request.nonAlcoholicOnly());
        boolean addedToCart = false;

        if (request.autoAddToCart() && request.tableId() != null && winningSector.getCocktail() != null) {
            addedToCart = addWinningDrinkToCart(
                    request.tableId(),
                    request.guestSessionId() != null ? request.guestSessionId() : UUID.randomUUID().toString(),
                    request.guestName() != null ? request.guestName() : "Guest",
                    winningSector.getCocktail().getId(),
                    winPrice,
                    winningSector.getLabel()
            );
        }

        List<RouletteWheelSectorDTO> allActiveDtos = activeSectors.stream()
                .map(RouletteWheelSectorDTO::from)
                .toList();

        return new RouletteSpinResultDTO(
                winningSector.getId(),
                winningIndex,
                winningSector.getPrizeType(),
                winningSector.getCocktail() != null ? winningSector.getCocktail().getId() : null,
                winningSector.getLabel(),
                winningSector.getCocktail() != null ? winningSector.getCocktail().getDescription() : winningSector.getRewardText(),
                winningSector.getCocktail() != null ? winningSector.getCocktail().getImageUrl() : null,
                winPrice,
                winningSector.getRewardText(),
                buildBarmanNote(winningSector),
                true,
                addedToCart,
                allActiveDtos
        );
    }

    /**
     * Triggers a live broadcast roulette spin for secondary screens and big displays.
     *
     * @param request Bartender trigger parameters and override options
     * @return Resolved spin outcome DTO
     */
    public RouletteSpinResultDTO triggerBroadcastSpin(RouletteBroadcastSpinRequestDTO request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.MYSTERY_ROULETTE);

        List<RouletteWheelSector> activeSectors = getOrInitActiveSectors();
        RouletteWheelSector winningSector = resolveBroadcastWinningSector(request, activeSectors);
        int winningIndex = findSectorIndex(activeSectors, winningSector.getId());

        BigDecimal winPrice = resolveWinningPrice(winningSector, false);
        boolean addedToCart = handleBroadcastAutoAddToCart(request, winningSector, winPrice);
        Integer tableNumero = resolveTableNumero(request.tableId());

        List<RouletteWheelSectorDTO> allActiveDtos = activeSectors.stream()
                .map(RouletteWheelSectorDTO::from)
                .toList();

        RouletteSpinResultDTO result = new RouletteSpinResultDTO(
                winningSector.getId(),
                winningIndex,
                winningSector.getPrizeType(),
                winningSector.getCocktail() != null ? winningSector.getCocktail().getId() : null,
                winningSector.getLabel(),
                winningSector.getCocktail() != null ? winningSector.getCocktail().getDescription() : winningSector.getRewardText(),
                winningSector.getCocktail() != null ? winningSector.getCocktail().getImageUrl() : null,
                winPrice,
                winningSector.getRewardText(),
                buildBarmanNote(winningSector),
                true,
                addedToCart,
                allActiveDtos
        );

        broadcastSpinEvent(request, result, tableNumero);
        return result;
    }

    private RouletteWheelSector resolveBroadcastWinningSector(
            RouletteBroadcastSpinRequestDTO request,
            List<RouletteWheelSector> activeSectors) {
        if ("RIGGED_SECTOR".equalsIgnoreCase(request.mode()) && request.riggedSectorId() != null) {
            return sectorRepository.findById(request.riggedSectorId()).orElse(activeSectors.get(0));
        }
        if ("RIGGED_COCKTAIL".equalsIgnoreCase(request.mode()) && request.riggedCocktailId() != null) {
            return resolveRiggedCocktailSector(request.riggedCocktailId(), activeSectors);
        }
        if ("CATEGORY".equalsIgnoreCase(request.mode()) && request.spiritCategory() != null) {
            RouletteSpinRequestDTO spinReq = new RouletteSpinRequestDTO(
                    request.tableId(),
                    null,
                    null,
                    request.spiritCategory(),
                    CATEGORY_MOCKTAIL.equalsIgnoreCase(request.spiritCategory()),
                    List.of(),
                    false
            );
            List<RouletteWheelSector> filtered = filterEligibleSectors(activeSectors, spinReq);
            return selectWinningSectorWithStockWeighting(!filtered.isEmpty() ? filtered : activeSectors);
        }
        return selectWinningSectorWithStockWeighting(activeSectors);
    }

    private RouletteWheelSector resolveRiggedCocktailSector(Long cocktailId, List<RouletteWheelSector> activeSectors) {
        for (RouletteWheelSector s : activeSectors) {
            if (s.getCocktail() != null && s.getCocktail().getId().equals(cocktailId)) {
                return s;
            }
        }
        Cocktail c = cocktailRepository.findById(cocktailId)
                .orElseThrow(() -> new ResourceNotFoundException(COCKTAIL_NOT_FOUND_MSG + cocktailId));
        RouletteWheelSector sector = new RouletteWheelSector();
        sector.setId(activeSectors.get(0).getId());
        sector.setLabel(c.getNom());
        sector.setCocktail(c);
        sector.setPrizeType(RoulettePrizeType.COCKTAIL);
        sector.setPrix(new BigDecimal("7.50"));
        return sector;
    }

    private int findSectorIndex(List<RouletteWheelSector> sectors, Long sectorId) {
        for (int i = 0; i < sectors.size(); i++) {
            if (sectors.get(i).getId().equals(sectorId)) {
                return i;
            }
        }
        return 0;
    }

    private Integer resolveTableNumero(Long tableId) {
        if (tableId == null) {
            return null;
        }
        return tableRepository.findById(tableId).map(t -> t.getNumero()).orElse(null);
    }

    private boolean handleBroadcastAutoAddToCart(
            RouletteBroadcastSpinRequestDTO request,
            RouletteWheelSector winningSector,
            BigDecimal winPrice) {
        if (request.tableId() != null && request.autoAddToCart() && winningSector.getCocktail() != null) {
            return addWinningDrinkToCart(
                    request.tableId(),
                    UUID.randomUUID().toString(),
                    "Barman Roulette",
                    winningSector.getCocktail().getId(),
                    winPrice,
                    winningSector.getLabel()
            );
        }
        return false;
    }

    private void broadcastSpinEvent(
            RouletteBroadcastSpinRequestDTO request,
            RouletteSpinResultDTO result,
            Integer tableNumero) {
        int durationMs = request.durationSeconds() != null ? request.durationSeconds() * 1000 : 5000;
        String soundProfile = request.soundProfile() != null ? request.soundProfile() : "CSGO";

        RouletteEventDTO eventDto = new RouletteEventDTO(
                "SPIN_TRIGGERED",
                UUID.randomUUID().toString(),
                request.tableId(),
                tableNumero,
                result,
                durationMs,
                soundProfile,
                timeService.now()
        );

        broadcastEvent(eventDto);
    }

    /**
     * Broadcasts a real-time event to the STOMP destination {@code /topic/roulette/events}.
     *
     * @param event The event payload
     */
    public void broadcastEvent(RouletteEventDTO event) {
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend("/topic/roulette/events", event);
            } catch (Exception e) {
                log.warn("Failed to broadcast roulette event: {}", e.getMessage());
            }
        }
    }

    /**
     * Retrieves all configured sectors ordered by display order.
     *
     * @return List of sectors
     */
    @Transactional(readOnly = true)
    public List<RouletteWheelSectorDTO> getAllSectors() {
        return sectorRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(RouletteWheelSectorDTO::from)
                .toList();
    }

    /**
     * Creates a new sector on the roulette wheel.
     *
     * @param dto Creation payload
     * @return Created sector DTO
     */
    public RouletteWheelSectorDTO createSector(RouletteWheelSectorRequestDTO dto) {
        Cocktail cocktail = null;
        if (dto.cocktailId() != null) {
            cocktail = cocktailRepository.findById(dto.cocktailId())
                    .orElseThrow(() -> new ResourceNotFoundException(COCKTAIL_NOT_FOUND_MSG + dto.cocktailId()));
        }

        RouletteWheelSector sector = new RouletteWheelSector();
        sector.setLabel(dto.label());
        sector.setPrizeType(dto.prizeType());
        sector.setCocktail(cocktail);
        sector.setRewardText(dto.rewardText());
        sector.setPrix(dto.prix());
        sector.setColorHex(dto.colorHex());
        sector.setIconName(dto.iconName());
        sector.setProbabilityWeight(dto.probabilityWeight());
        sector.setActive(dto.active());
        sector.setDisplayOrder(dto.displayOrder());

        RouletteWheelSector saved = sectorRepository.save(sector);
        notifySectorsUpdated();
        return RouletteWheelSectorDTO.from(saved);
    }

    /**
     * Updates an existing roulette sector.
     *
     * @param id  Sector ID
     * @param dto Update payload
     * @return Updated sector DTO
     */
    public RouletteWheelSectorDTO updateSector(Long id, RouletteWheelSectorRequestDTO dto) {
        RouletteWheelSector sector = sectorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Roulette sector not found with id: " + id));

        Cocktail cocktail = null;
        if (dto.cocktailId() != null) {
            cocktail = cocktailRepository.findById(dto.cocktailId())
                    .orElseThrow(() -> new ResourceNotFoundException(COCKTAIL_NOT_FOUND_MSG + dto.cocktailId()));
        }

        sector.setLabel(dto.label());
        sector.setPrizeType(dto.prizeType());
        sector.setCocktail(cocktail);
        sector.setRewardText(dto.rewardText());
        sector.setPrix(dto.prix());
        sector.setColorHex(dto.colorHex());
        sector.setIconName(dto.iconName());
        sector.setProbabilityWeight(dto.probabilityWeight());
        sector.setActive(dto.active());
        sector.setDisplayOrder(dto.displayOrder());

        RouletteWheelSector updated = sectorRepository.save(sector);
        notifySectorsUpdated();
        return RouletteWheelSectorDTO.from(updated);
    }

    /**
     * Deletes a sector from the roulette wheel.
     *
     * @param id Sector ID
     */
    public void deleteSector(Long id) {
        RouletteWheelSector sector = sectorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Roulette sector not found with id: " + id));
        sectorRepository.delete(sector);
        notifySectorsUpdated();
    }

    /**
     * Reinitializes default starter wheel sectors.
     *
     * @return List of newly initialized sectors
     */
    public List<RouletteWheelSector> initDefaultSectors() {
        List<Cocktail> catalog = cocktailRepository.findAll();

        Cocktail mojito = findCocktailByName(catalog, "Mojito");
        Cocktail margarita = findCocktailByName(catalog, "Margarita");
        Cocktail pinaColada = findCocktailByName(catalog, "Piña Colada");
        Cocktail virginMojito = findCocktailByName(catalog, "Virgin Mojito");
        Cocktail moscowMule = findCocktailByName(catalog, "Moscow Mule");

        List<SectorTemplate> templates = List.of(
                new SectorTemplate("Mojito", RoulettePrizeType.COCKTAIL, mojito, null, new BigDecimal("7.50"), "#10b981", DEFAULT_ICON, 2, 0),
                new SectorTemplate("Création du Barman", RoulettePrizeType.BARTENDER_SPECIAL, null, "Recette surprise selon stocks du moment", new BigDecimal("7.50"), "#f59e0b", "sparkles-outline", 3, 1),
                new SectorTemplate("Margarita", RoulettePrizeType.COCKTAIL, margarita, null, new BigDecimal("7.50"), "#ec4899", DEFAULT_ICON, 2, 2),
                new SectorTemplate("Tournée de Shooters", RoulettePrizeType.SHOOTER, null, "1 shooter maison offert", BigDecimal.ZERO, "#ef4444", "flame-outline", 1, 3),
                new SectorTemplate("Piña Colada", RoulettePrizeType.COCKTAIL, pinaColada, null, new BigDecimal("7.50"), "#8b5cf6", DEFAULT_ICON, 2, 4),
                new SectorTemplate("Shooter au Choix", RoulettePrizeType.CUSTOM_REWARD, null, "Shooter au choix de la carte", BigDecimal.ZERO, "#06b6d4", "gift-outline", 1, 5),
                new SectorTemplate("Virgin Mojito", RoulettePrizeType.COCKTAIL, virginMojito, null, new BigDecimal("5.50"), "#3b82f6", "leaf-outline", 2, 6),
                new SectorTemplate("Moscow Mule", RoulettePrizeType.COCKTAIL, moscowMule, null, new BigDecimal("7.50"), "#6366f1", "beer-outline", 2, 7)
        );

        return sectorRepository.saveAll(templates.stream().map(t -> t.toEntity()).toList());
    }

    private List<RouletteWheelSector> getOrInitActiveSectors() {
        List<RouletteWheelSector> active = sectorRepository.findByActiveTrueOrderByDisplayOrderAsc();
        return active.isEmpty() ? initDefaultSectors() : active;
    }

    private Cocktail findCocktailByName(List<Cocktail> list, String name) {
        return list.stream()
                .filter(c -> c.getNom().equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
    }

    private List<RouletteWheelSector> filterEligibleSectors(List<RouletteWheelSector> sectors, RouletteSpinRequestDTO req) {
        return sectors.stream()
                .filter(s -> isSectorEligible(s, req))
                .toList();
    }

    private boolean isSectorEligible(RouletteWheelSector sector, RouletteSpinRequestDTO req) {
        // Anti-fraud: client self-spins must only land on billable menu drinks, never free rewards or discounts
        if (sector.getPrizeType() == RoulettePrizeType.CUSTOM_REWARD) {
            return false;
        }
        if (sector.getPrix() != null && sector.getPrix().compareTo(BigDecimal.ZERO) <= 0 && sector.getCocktail() == null) {
            return false;
        }
        if (req.nonAlcoholicOnly() && isAlcoholic(sector)) {
            return false;
        }
        if (req.spiritCategory() != null && !req.spiritCategory().isBlank() && !"ALL".equalsIgnoreCase(req.spiritCategory())
                && sector.getPrizeType() == RoulettePrizeType.COCKTAIL && sector.getCocktail() != null
                && !matchesSpirit(sector.getCocktail(), req.spiritCategory())) {
            return false;
        }
        return req.excludedAllergens() == null || req.excludedAllergens().isEmpty()
                || sector.getPrizeType() != RoulettePrizeType.COCKTAIL || sector.getCocktail() == null
                || !containsExcludedAllergens(sector.getCocktail(), req.excludedAllergens());
    }

    private boolean isAlcoholic(RouletteWheelSector sector) {
        if (sector.getPrizeType() == RoulettePrizeType.SHOOTER) {
            return true;
        }
        if (sector.getPrizeType() == RoulettePrizeType.COCKTAIL && sector.getCocktail() != null) {
            Cocktail c = sector.getCocktail();
            if (c.getCategorie() == CocktailCategorie.ALCOOLISE) {
                return true;
            }
            if (isMocktail(c)) {
                return false;
            }
            return c.getAlcoholLevel() == null || c.getAlcoholLevel().compareTo(BigDecimal.ZERO) > 0;
        }
        return false;
    }

    private boolean isMocktail(Cocktail cocktail) {
        if (cocktail.getCategorie() == CocktailCategorie.ALCOOLISE) {
            return false;
        }
        return Boolean.TRUE.equals(cocktail.getIsMocktail())
                || cocktail.getCategorie() == CocktailCategorie.SANS_ALCOOL
                || (cocktail.getAlcoholLevel() != null && cocktail.getAlcoholLevel().compareTo(BigDecimal.ZERO) == 0);
    }

    private boolean matchesSpirit(Cocktail cocktail, String spirit) {
        if (spirit == null || spirit.isBlank() || "ALL".equalsIgnoreCase(spirit)) {
            return true;
        }
        if (CATEGORY_MOCKTAIL.equalsIgnoreCase(spirit)) {
            return isMocktail(cocktail);
        }
        String target = spirit.toLowerCase();
        if (cocktail.getNom() != null && cocktail.getNom().toLowerCase().contains(target)) {
            return true;
        }
        if (cocktail.getDescription() != null && cocktail.getDescription().toLowerCase().contains(target)) {
            return true;
        }
        return ingredientsMatchSpirit(cocktail.getIngredients(), target);
    }

    private boolean ingredientsMatchSpirit(List<CocktailIngredient> ingredients, String target) {
        if (ingredients == null) {
            return false;
        }
        for (CocktailIngredient ci : ingredients) {
            if (ci.getIngredient() != null && ci.getIngredient().getNom() != null
                    && ci.getIngredient().getNom().toLowerCase().contains(target)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsExcludedAllergens(Cocktail cocktail, List<Allergen> excluded) {
        if (cocktail.getIngredients() == null) {
            return false;
        }
        for (CocktailIngredient ci : cocktail.getIngredients()) {
            if (ci.getIngredient() != null && ci.getIngredient().getAllergens() != null) {
                for (Allergen a : ci.getIngredient().getAllergens()) {
                    if (excluded.contains(a)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private RouletteWheelSector selectWinningSectorWithStockWeighting(List<RouletteWheelSector> sectors) {
        int totalWeight = 0;
        int[] cumulativeWeights = new int[sectors.size()];

        for (int i = 0; i < sectors.size(); i++) {
            RouletteWheelSector s = sectors.get(i);
            int weight = s.getProbabilityWeight() * 10;

            if (s.getPrizeType() == RoulettePrizeType.COCKTAIL && s.getCocktail() != null) {
                weight = calculateCocktailStockWeight(s.getCocktail(), weight);
            } else if (s.getPrizeType() == RoulettePrizeType.BARTENDER_SPECIAL) {
                weight += 20;
            }

            totalWeight += Math.max(weight, 1);
            cumulativeWeights[i] = totalWeight;
        }

        if (totalWeight <= 0) {
            return sectors.get(0);
        }

        int roll = random.nextInt(totalWeight);
        for (int i = 0; i < cumulativeWeights.length; i++) {
            if (roll < cumulativeWeights[i]) {
                return sectors.get(i);
            }
        }
        return sectors.get(sectors.size() - 1);
    }

    private int calculateCocktailStockWeight(Cocktail cocktail, int baseWeight) {
        if (cocktail.getIngredients() == null || cocktail.getIngredients().isEmpty()) {
            return baseWeight;
        }

        int weight = baseWeight;
        LocalDateTime now = timeService.now();

        for (CocktailIngredient ci : cocktail.getIngredients()) {
            Ingredient ing = ci.getIngredient();
            if (ing == null) continue;

            if (ing.getQuantiteStock() == null || ing.getQuantiteStock().compareTo(ci.getQuantite()) < 0) {
                return 0;
            }

            if (ing.getSeuilAlerte() != null
                    && ing.getQuantiteStock().compareTo(ing.getSeuilAlerte().multiply(BigDecimal.valueOf(3))) > 0) {
                weight += 15;
            }

            if (ing.getDatePeremption() != null && ing.getDatePeremption().isBefore(now.plusDays(14))) {
                weight += 25;
            }
        }

        return Math.max(weight, 1);
    }

    private BigDecimal resolveWinningPrice(RouletteWheelSector sector, boolean isMocktail) {
        if (sector.getCocktail() != null && sector.getCocktail().getPrix() != null) {
            return sector.getCocktail().getPrix();
        }
        if (sector.getPrix() != null && sector.getPrix().compareTo(BigDecimal.ZERO) > 0) {
            return sector.getPrix();
        }
        return new BigDecimal(isMocktail ? "5.50" : "7.50");
    }

    private boolean addWinningDrinkToCart(
            Long tableId,
            String guestSessionId,
            String guestName,
            Long cocktailId,
            BigDecimal price,
            String label) {
        try {
            TableCartItemRequestDTO cartItem = new TableCartItemRequestDTO(
                    guestSessionId,
                    guestName,
                    cocktailId,
                    null,
                    1,
                    "[Mystery Drink 🎲] " + label,
                    true,
                    price
            );
            tableCartService.addItem(tableId, cartItem);
            return true;
        } catch (Exception e) {
            log.warn("Failed to auto-add mystery drink to table cart {}: {}", tableId, e.getMessage());
            return false;
        }
    }

    private String buildBarmanNote(RouletteWheelSector sector) {
        if (sector.getPrizeType() == RoulettePrizeType.BARTENDER_SPECIAL) {
            return "Création Barman — Utiliser les spiritueux excédentaires ou approchant de la DLC.";
        }
        if (sector.getPrizeType() == RoulettePrizeType.SHOOTER) {
            return "Tournée de shooters gagnée à la Roulette.";
        }
        return "Boisson mystère servie au tarif préférentiel Roulette.";
    }

    private void notifySectorsUpdated() {
        RouletteEventDTO event = new RouletteEventDTO(
                "SECTORS_UPDATED",
                UUID.randomUUID().toString(),
                null,
                null,
                null,
                0,
                "CSGO",
                timeService.now()
        );
        broadcastEvent(event);
    }

    /**
     * Verifies whether a 4-digit PIN matches the configured roulette TV display access code.
     *
     * @param pin 4-digit PIN code
     * @return Verification response DTO
     */
    @Transactional(readOnly = true)
    public RoulettePinVerificationResponseDTO verifyDisplayPin(String pin) {
        if (pin == null || pin.isBlank()) {
            return new RoulettePinVerificationResponseDTO(false);
        }
        EstablishmentConfig config = establishmentConfigService.getConfig();
        String currentPin = config.getRouletteDisplayPin();
        boolean valid = pin.trim().equals(currentPin);
        return new RoulettePinVerificationResponseDTO(valid);
    }

    /**
     * Retrieves the current 4-digit display access PIN for staff management.
     *
     * @return Current PIN DTO
     */
    @Transactional(readOnly = true)
    public RoulettePinDTO getDisplayPin() {
        EstablishmentConfig config = establishmentConfigService.getConfig();
        return new RoulettePinDTO(config.getRouletteDisplayPin());
    }

    /**
     * Updates the 4-digit PIN for the roulette TV display screen and broadcasts revocation to live screens.
     *
     * @param newPin 4-digit numeric PIN
     * @return Updated PIN DTO
     */
    public RoulettePinDTO updateDisplayPin(String newPin) {
        if (newPin == null || !newPin.matches("^\\d{4}$")) {
            throw new com.bar.gestioncocktail.exception.BusinessException("PIN must be exactly 4 digits");
        }
        establishmentConfigService.updateRouletteDisplayPin(newPin);
        broadcastPinRevoked();
        log.info("Roulette TV display PIN updated to {} by staff", newPin);
        return new RoulettePinDTO(newPin);
    }

    /**
     * Regenerates a random 4-digit PIN for the roulette display and instantly revokes all active TV sessions.
     *
     * @return Newly generated PIN DTO
     */
    public RoulettePinDTO regenerateDisplayPin() {
        int randomPin = random.nextInt(10000);
        String formattedPin = String.format("%04d", randomPin);
        establishmentConfigService.updateRouletteDisplayPin(formattedPin);
        broadcastPinRevoked();
        log.info("Roulette TV display PIN regenerated to {} by staff", formattedPin);
        return new RoulettePinDTO(formattedPin);
    }

    private void broadcastPinRevoked() {
        RouletteEventDTO event = new RouletteEventDTO(
                "PIN_REVOKED",
                UUID.randomUUID().toString(),
                null,
                null,
                null,
                0,
                "CSGO",
                timeService.now()
        );
        broadcastEvent(event);
    }

    private record SectorTemplate(
            String label,
            RoulettePrizeType type,
            Cocktail cocktail,
            String rewardText,
            BigDecimal price,
            String colorHex,
            String iconName,
            int weight,
            int order
    ) {
        RouletteWheelSector toEntity() {
            RouletteWheelSector s = new RouletteWheelSector();
            s.setLabel(label);
            s.setPrizeType(type);
            s.setCocktail(cocktail);
            s.setRewardText(rewardText);
            s.setPrix(price);
            s.setColorHex(colorHex);
            s.setIconName(iconName);
            s.setProbabilityWeight(weight);
            s.setActive(true);
            s.setDisplayOrder(order);
            return s;
        }
    }
}
