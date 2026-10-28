package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.PublicCommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.event.OrderUpdatedEvent;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.InvalidTableSessionException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.exception.StockInsuffisantException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service managing patron self-ordering via QR code scans and ephemeral order tracking.
 */
@Service
@Transactional
public class PublicCommandeService {

    private static final BigDecimal DEFAULT_ROULETTE_MOCKTAIL_FLOOR = new BigDecimal("5.50");
    private static final BigDecimal DEFAULT_ROULETTE_COCKTAIL_FLOOR = new BigDecimal("7.50");

    private final CommandeRepository commandeRepository;
    private final TableRepository tableRepository;
    private final CocktailRepository cocktailRepository;
    private final CocktailVarianteRepository varianteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TimeService timeService;
    private final TableSessionService tableSessionService;
    private final HappyHourService happyHourService;

    /**
     * Constructs the public order service with required repositories and services.
     *
     * @param commandeRepository Repository for orders
     * @param tableRepository Repository for tables
     * @param cocktailRepository Repository for cocktails
     * @param varianteRepository Repository for cocktail variants
     * @param eventPublisher Spring event publisher
     * @param timeService Application time service
     * @param tableSessionService Table session validation service
     * @param happyHourService Happy hour pricing service
     */
    public PublicCommandeService(
            CommandeRepository commandeRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            ApplicationEventPublisher eventPublisher,
            TimeService timeService,
            TableSessionService tableSessionService,
            HappyHourService happyHourService) {
        this.commandeRepository = commandeRepository;
        this.tableRepository = tableRepository;
        this.cocktailRepository = cocktailRepository;
        this.varianteRepository = varianteRepository;
        this.eventPublisher = eventPublisher;
        this.timeService = timeService;
        this.tableSessionService = tableSessionService;
        this.happyHourService = happyHourService;
    }

    /**
     * Validates and processes a patron self-order submitted via QR code scan.
     *
     * @param dto Public order request payload
     * @return Created order response DTO
     */
    public PublicCommandeResponseDTO creerCommandePublique(PublicCommandeRequestDTO dto) {
        if (tableSessionService != null && !tableSessionService.isSessionValidForOrder(dto.getTableId(), dto.getSessionToken())) {
            throw new InvalidTableSessionException("Invalid or expired table session token for table " + dto.getTableId());
        }

        TableEntity table = tableRepository.findById(dto.getTableId())
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + dto.getTableId()));

        Commande commande = new Commande();
        commande.setTable(table);
        commande.setNotes(dto.getNotes());
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setDateCommande(timeService.now());
        commande.setTrackingToken(UUID.randomUUID().toString());

        List<CommandeItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (PublicCommandeItemRequestDTO itemDto : dto.getItems()) {
            CommandeItem item = construireCommandeItem(itemDto, commande);
            items.add(item);
            BigDecimal sousTotal = item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite()));
            total = total.add(sousTotal);
        }

        commande.setItems(items);
        commande.setTotal(total);

        Commande savedCommande = commandeRepository.save(commande);
        occuperTableSiLibre(table);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderCreatedEvent(savedCommande));
        }

        long pendingCount = commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE);
        int tempsEstime = (int) (5 + (pendingCount * 3));

        return PublicCommandeResponseDTO.from(savedCommande, tempsEstime);
    }

    private CommandeItem construireCommandeItem(PublicCommandeItemRequestDTO itemDto, Commande commande) {
        if (itemDto.getQuantite() <= 0) {
            throw new BusinessException("Order item quantity must be at least 1");
        }

        Cocktail cocktail = cocktailRepository.findById(itemDto.getCocktailId())
                .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found with id: " + itemDto.getCocktailId()));

        CocktailVariante variante = resolveVariante(itemDto.getVarianteId());
        boolean isMystery = Boolean.TRUE.equals(itemDto.getIsMysteryDrink());
        BigDecimal prixUnitaire = isMystery
                ? resolveMysteryUnitPrice(itemDto, cocktail)
                : resolveStandardUnitPrice(itemDto, cocktail, variante);

        verifierDisponibiliteIngredients(cocktail, itemDto.getQuantite());

        CommandeItem item = new CommandeItem();
        item.setCommande(commande);
        item.setCocktail(cocktail);
        item.setVariante(variante);
        item.setQuantite(itemDto.getQuantite());
        item.setPrixUnitaire(prixUnitaire);
        item.setNotes(itemDto.getNotes());
        item.setIsMysteryDrink(isMystery);
        return item;
    }

    private CocktailVariante resolveVariante(Long varianteId) {
        if (varianteId == null) {
            return null;
        }
        return varianteRepository.findById(varianteId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant not found with id: " + varianteId));
    }

    private BigDecimal resolveMysteryUnitPrice(PublicCommandeItemRequestDTO itemDto, Cocktail cocktail) {
        BigDecimal minMysteryPrice = resolveMinimumMysteryPrice(cocktail);
        BigDecimal override = itemDto.getPrixOverride();
        if (override == null) {
            return minMysteryPrice;
        }
        if (override.compareTo(BigDecimal.ZERO) <= 0 || override.compareTo(minMysteryPrice) < 0) {
            throw new BusinessException("Invalid mystery drink price override: below minimum allowed roulette price");
        }
        return override;
    }

    private BigDecimal resolveStandardUnitPrice(
            PublicCommandeItemRequestDTO itemDto,
            Cocktail cocktail,
            CocktailVariante variante) {
        if (itemDto.getPrixOverride() != null) {
            throw new BusinessException("Price override is not allowed for standard menu items");
        }
        if (happyHourService != null) {
            BigDecimal effectivePrice = happyHourService.resolveEffectivePrice(cocktail, variante, timeService.now());
            if (effectivePrice != null) {
                return effectivePrice;
            }
        }
        BigDecimal basePrice = cocktail.getPrix() != null ? cocktail.getPrix() : BigDecimal.ZERO;
        if (variante != null && variante.getPrixSupplement() != null) {
            return basePrice.add(variante.getPrixSupplement());
        }
        return basePrice;
    }

    private BigDecimal resolveMinimumMysteryPrice(Cocktail cocktail) {
        boolean isMocktail = Boolean.TRUE.equals(cocktail.getIsMocktail())
                || cocktail.getCategorie() == CocktailCategorie.SANS_ALCOOL;
        BigDecimal floorPrice = isMocktail ? DEFAULT_ROULETTE_MOCKTAIL_FLOOR : DEFAULT_ROULETTE_COCKTAIL_FLOOR;
        BigDecimal catalogPrice = cocktail.getPrix();
        if (catalogPrice != null && catalogPrice.compareTo(BigDecimal.ZERO) > 0 && catalogPrice.compareTo(floorPrice) < 0) {
            return catalogPrice;
        }
        return floorPrice;
    }

    private void verifierDisponibiliteIngredients(Cocktail cocktail, int quantite) {
        if (cocktail.getIngredients() == null) {
            return;
        }

        for (CocktailIngredient ci : cocktail.getIngredients()) {
            Ingredient ing = ci.getIngredient();
            if (ing != null && ing.getQuantiteStock() != null) {
                BigDecimal besoin = ci.getQuantite().multiply(BigDecimal.valueOf(quantite));
                if (ing.getQuantiteStock().compareTo(besoin) < 0) {
                    throw new StockInsuffisantException("Insufficient stock for ingredient: " + ing.getNom());
                }
            }
        }
    }

    private void occuperTableSiLibre(TableEntity table) {
        if (!table.isOccupee()) {
            table.setOccupee(true);
            table.setDateOccupation(timeService.now());
            tableRepository.save(table);
        }
    }

    /**
     * Retrieves order tracking information using an ephemeral tracking token.
     *
     * @param trackingToken Ephemeral customer tracking token
     * @return Order response DTO
     */
    @Transactional(readOnly = true)
    public PublicCommandeResponseDTO getCommandeParTrackingToken(String trackingToken) {
        Commande commande = commandeRepository.findByTrackingToken(trackingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for tracking token: " + trackingToken));

        int tempsEstime = 0;
        if (commande.getStatut() == CommandeStatut.EN_ATTENTE) {
            long pendingCount = commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE);
            tempsEstime = (int) (5 + (pendingCount * 3));
        } else if (commande.getStatut() == CommandeStatut.EN_PREPARATION) {
            tempsEstime = 3;
        }

        return PublicCommandeResponseDTO.from(commande, tempsEstime);
    }

    /**
     * Appends additional ordered cocktail items to an existing pending order during grouping grace windows.
     *
     * @param commandeId Existing order identifier
     * @param itemsDto Additional items to append
     * @return Updated order response DTO
     */
    public PublicCommandeResponseDTO ajouterArticlesACommande(Long commandeId, List<PublicCommandeItemRequestDTO> itemsDto) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + commandeId));

        if (commande.getStatut() != CommandeStatut.EN_ATTENTE) {
            throw new BusinessException("Cannot append items: Order is already " + commande.getStatut());
        }

        List<CommandeItem> currentItems = commande.getItems();
        if (currentItems == null) {
            currentItems = new ArrayList<>();
        }

        BigDecimal additionalTotal = BigDecimal.ZERO;
        for (PublicCommandeItemRequestDTO itemDto : itemsDto) {
            CommandeItem item = construireCommandeItem(itemDto, commande);
            currentItems.add(item);
            BigDecimal sousTotal = item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite()));
            additionalTotal = additionalTotal.add(sousTotal);
        }

        commande.setItems(currentItems);
        commande.setTotal(commande.getTotal() != null ? commande.getTotal().add(additionalTotal) : additionalTotal);

        Commande savedCommande = commandeRepository.save(commande);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderUpdatedEvent(savedCommande));
        }

        long pendingCount = commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE);
        int tempsEstime = (int) (5 + (pendingCount * 3));

        return PublicCommandeResponseDTO.from(savedCommande, tempsEstime);
    }
}
