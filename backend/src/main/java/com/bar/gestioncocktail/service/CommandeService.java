package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ModifierCommandeItemDTO;
import com.bar.gestioncocktail.dto.ModifierCommandeRequestDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.model.CocktailVarianteIngredient;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.PreparationStation;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.event.OrderCancelledEvent;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.event.OrderDeletedEvent;
import com.bar.gestioncocktail.event.OrderStatusChangedEvent;
import com.bar.gestioncocktail.event.OrderUpdatedEvent;
import com.bar.gestioncocktail.event.StockAlertEvent;
import com.bar.gestioncocktail.event.TableUpdatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service managing order lifecycle, status transitions, item manipulation, and
 * automated stock deductions.
 */
@Service
public class CommandeService {

    private static final Logger log = LoggerFactory.getLogger(CommandeService.class);
    private static final String COMMANDE_NOT_FOUND = "Order not found with id: ";

    private final CommandeRepository commandeRepository;
    private final CommandeItemRepository commandeItemRepository;
    private final IngredientRepository ingredientRepository;
    private final TableRepository tableRepository;
    private final CocktailRepository cocktailRepository;
    private final CocktailVarianteRepository cocktailVarianteRepository;
    private final CocktailIngredientRepository cocktailIngredientRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TimeService timeService;
    private final HappyHourService happyHourService;

    @org.springframework.beans.factory.annotation.Autowired
    public CommandeService(
            CommandeRepository commandeRepository,
            CommandeItemRepository commandeItemRepository,
            IngredientRepository ingredientRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository cocktailVarianteRepository,
            CocktailIngredientRepository cocktailIngredientRepository,
            ApplicationEventPublisher eventPublisher,
            TimeService timeService,
            HappyHourService happyHourService) {
        this.commandeRepository = commandeRepository;
        this.commandeItemRepository = commandeItemRepository;
        this.ingredientRepository = ingredientRepository;
        this.tableRepository = tableRepository;
        this.cocktailRepository = cocktailRepository;
        this.cocktailVarianteRepository = cocktailVarianteRepository;
        this.cocktailIngredientRepository = cocktailIngredientRepository;
        this.eventPublisher = eventPublisher;
        this.timeService = timeService;
        this.happyHourService = happyHourService;
    }

    public CommandeService(
            CommandeRepository commandeRepository,
            CommandeItemRepository commandeItemRepository,
            IngredientRepository ingredientRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository cocktailVarianteRepository,
            CocktailIngredientRepository cocktailIngredientRepository,
            ApplicationEventPublisher eventPublisher,
            TimeService timeService) {
        this(commandeRepository, commandeItemRepository, ingredientRepository, tableRepository,
                cocktailRepository, cocktailVarianteRepository, cocktailIngredientRepository,
                eventPublisher, timeService, null);
    }

    @Transactional(readOnly = true)
    public List<Commande> getAllCommandes() {
        return commandeRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Commande> getCommandeById(Long id) {
        return commandeRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Commande> getCommandesByTable(TableEntity table) {
        return commandeRepository.findByTable(table);
    }

    @Transactional(readOnly = true)
    public List<Commande> getCommandesByServeur(User serveur) {
        return commandeRepository.findByServeur(serveur);
    }

    @Transactional(readOnly = true)
    public List<Commande> getCommandesByStatut(CommandeStatut statut) {
        return commandeRepository.findByStatut(statut);
    }

    @Transactional(readOnly = true)
    public List<Commande> getCommandesByTableAndStatut(TableEntity table, CommandeStatut statut) {
        return commandeRepository.findByTableAndStatut(table, statut);
    }

    @Transactional(readOnly = true)
    public List<Commande> getCommandesByDate(LocalDateTime debut, LocalDateTime fin) {
        return commandeRepository.findByDateCommandeBetween(debut, fin);
    }

    @Transactional
    public Commande createCommande(Commande commande) {
        LocalDateTime now = timeService.now();
        commande.setCreatedAt(now);
        commande.setUpdatedAt(now);
        commande.setDateCommande(now);
        commande.setStatut(CommandeStatut.EN_ATTENTE);

        initializeOrderItems(commande);

        applyDynamicPricingAndCalculateTotal(commande, now);

        Commande saved = commandeRepository.save(commande);
        updateTableOccupancyOnOrderCreation(saved);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderCreatedEvent(saved));
        }
        notifyOrderUpdated(saved);
        return saved;
    }

    private void initializeOrderItems(Commande commande) {
        if (commande.getItems() == null) return;
        for (CommandeItem item : commande.getItems()) {
            if (item.getCommande() == null) {
                item.setCommande(commande);
            }
            if (item.getStation() == null) {
                item.setStation(item.getCocktail() != null && item.getCocktail().getStation() != null
                        ? item.getCocktail().getStation() : PreparationStation.BAR);
            }
            if (item.getStatut() == null) {
                item.setStatut(CommandeStatut.EN_ATTENTE);
            }
        }
    }

    @Transactional
    public Commande updateCommande(Long id, Commande commandeDetails) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));

        commande.setNotes(commandeDetails.getNotes());
        commande.setPourboire(commandeDetails.getPourboire());
        commande.setUpdatedAt(timeService.now());

        if (commandeDetails.getTable() != null) {
            commande.setTable(commandeDetails.getTable());
        }
        if (commandeDetails.getServeur() != null) {
            commande.setServeur(commandeDetails.getServeur());
        }

        Commande saved = commandeRepository.save(commande);
        notifyOrderUpdated(saved);
        return saved;
    }

    @Transactional
    public void deleteCommande(Long id) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));
        TableEntity table = commande.getTable();
        commande.setStatut(CommandeStatut.ANNULEE);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderCancelledEvent(commande));
        }
        notifyOrderUpdated(commande);
        commandeRepository.delete(commande);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderDeletedEvent(id));
        }
        if (table != null) {
            notifyTableUpdated(table);
        }
    }

    @Transactional
    public Commande ajouterItem(Long commandeId, CommandeItem item) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));

        if (item.getCocktail() != null && item.getCocktail().getId() != null) {
            cocktailRepository.findById(item.getCocktail().getId()).ifPresent(item::setCocktail);
        }

        LocalDateTime orderTime = commande.getDateCommande() != null ? commande.getDateCommande() : timeService.now();
        applyDynamicPricingToItem(item, orderTime);

        if (item.getStation() == null) {
            item.setStation(item.getCocktail() != null && item.getCocktail().getStation() != null
                    ? item.getCocktail().getStation() : PreparationStation.BAR);
        }
        if (item.getStatut() == null) {
            item.setStatut(CommandeStatut.EN_ATTENTE);
        }

        item.setCommande(commande);
        commandeItemRepository.save(item);
        if (commande.getItems() == null) {
            commande.setItems(new java.util.ArrayList<>());
        }
        if (!commande.getItems().contains(item)) {
            commande.getItems().add(item);
        }

        commande.setTotal(calculateOrderTotal(commande.getItems()));
        commande.setDateModification(timeService.now());

        Commande saved = commandeRepository.save(commande);
        notifyOrderUpdated(saved);
        return saved;
    }

    private void applyDynamicPricingAndCalculateTotal(Commande commande, LocalDateTime now) {
        if (commande.getItems() == null || happyHourService == null) {
            return;
        }
        for (CommandeItem item : commande.getItems()) {
            applyDynamicPricingToItem(item, now);
        }
        BigDecimal total = calculateOrderTotal(commande.getItems());
        if (total.compareTo(BigDecimal.ZERO) > 0) {
            commande.setTotal(total);
        }
    }

    private void applyDynamicPricingToItem(CommandeItem item, LocalDateTime orderTime) {
        if (happyHourService != null && item.getCocktail() != null) {
            BigDecimal dynamicPrice = happyHourService.resolveEffectivePrice(
                    item.getCocktail(), item.getVariante(), orderTime);
            if (item.getPrixUnitaire() == null || dynamicPrice.compareTo(item.getPrixUnitaire()) < 0) {
                item.setPrixUnitaire(dynamicPrice);
            }
        }
    }

    private BigDecimal calculateOrderTotal(List<CommandeItem> items) {
        if (items == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (CommandeItem item : items) {
            if (item.getPrixUnitaire() != null) {
                total = total.add(item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite())));
            }
        }
        return total;
    }

    @Transactional
    public Commande retirerItem(Long commandeId, Long itemId) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));

        commande.getItems().removeIf(item -> item.getId().equals(itemId));
        if (commande.getItems().isEmpty()) {
            commande.setStatut(CommandeStatut.ANNULEE);
        }
        recalculateTotal(commande);
        commande.setDateModification(timeService.now());

        Commande saved = commandeRepository.save(commande);
        notifyOrderUpdated(saved);
        return saved;
    }

    @Transactional
    public Commande changerStatut(Long id, CommandeStatut nouveauStatut) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));

        CommandeStatut oldStatut = commande.getStatut();
        commande.setStatut(nouveauStatut);
        commande.setUpdatedAt(timeService.now());

        applyOrderTimestampsOnStatusChange(commande, nouveauStatut);
        cascadeOrderStatusToItems(commande, nouveauStatut);

        Commande saved = commandeRepository.save(commande);
        if (saved.getTable() != null) {
            notifyTableUpdated(saved.getTable());
        }
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderStatusChangedEvent(saved.getId(), oldStatut, nouveauStatut, saved));
        }
        notifyOrderUpdated(saved);
        return saved;
    }

    private void applyOrderTimestampsOnStatusChange(Commande commande, CommandeStatut nouveauStatut) {
        switch (nouveauStatut) {
            case EN_PREPARATION:
                if (commande.getDatePreparation() == null) {
                    commande.setDatePreparation(timeService.now());
                    destockerIngredients(commande);
                }
                break;
            case PRET:
                commande.setDatePret(timeService.now());
                break;
            case LIVREE:
                commande.setDateLivraison(timeService.now());
                break;
            case REGLEE:
                commande.setDateReglement(timeService.now());
                break;
            default:
                break;
        }
    }

    private void cascadeOrderStatusToItems(Commande commande, CommandeStatut nouveauStatut) {
        if (commande.getItems() == null) return;
        for (CommandeItem it : commande.getItems()) {
            if (nouveauStatut == CommandeStatut.EN_PREPARATION && it.getStatut() == CommandeStatut.EN_ATTENTE) {
                it.setStatut(CommandeStatut.EN_PREPARATION);
            } else if (nouveauStatut == CommandeStatut.PRET && (it.getStatut() == CommandeStatut.EN_ATTENTE || it.getStatut() == CommandeStatut.EN_PREPARATION)) {
                it.setStatut(CommandeStatut.PRET);
            } else if (nouveauStatut == CommandeStatut.LIVREE) {
                it.setStatut(CommandeStatut.LIVREE);
            } else if (nouveauStatut == CommandeStatut.ANNULEE) {
                it.setStatut(CommandeStatut.ANNULEE);
            }
        }
    }

    @Transactional
    public void annulerCommande(Commande commande) {
        if (commande.getStatut() != CommandeStatut.ANNULEE && commande.getDatePreparation() != null) {
            reincrementerStockIngredients(commande);
        }
        commande.setStatut(CommandeStatut.ANNULEE);
        if (commande.getItems() != null) {
            for (CommandeItem it : commande.getItems()) {
                it.setStatut(CommandeStatut.ANNULEE);
            }
        }
        commande.setUpdatedAt(timeService.now());
        Commande saved = commandeRepository.save(commande);
        if (saved.getTable() != null) {
            notifyTableUpdated(saved.getTable());
        }
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderCancelledEvent(saved));
        }
        notifyOrderUpdated(saved);
    }

    public void definirPriorite(CommandeItem item, boolean prioritaire) {
        item.setPrioritaire(prioritaire);
        commandeItemRepository.save(item);
    }

    /**
     * Toggles priority / urgent state of an order.
     *
     * @param commandeId Order identifier
     * @return Updated Commande entity
     */
    @Transactional
    public Commande toggleUrgent(Long commandeId) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));
        return applyUrgentStatus(commande, !commande.isPrioritaire());
    }

    /**
     * Sets explicit priority / urgent state of an order.
     *
     * @param commandeId Order identifier
     * @param prioritaire Urgent status flag
     * @return Updated Commande entity
     */
    @Transactional
    public Commande setUrgent(Long commandeId, boolean prioritaire) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));
        return applyUrgentStatus(commande, prioritaire);
    }

    private Commande applyUrgentStatus(Commande commande, boolean prioritaire) {
        commande.setPrioritaire(prioritaire);
        if (commande.getItems() != null) {
            for (CommandeItem item : commande.getItems()) {
                item.setPrioritaire(prioritaire);
            }
        }
        commande.setUpdatedAt(timeService.now());
        Commande saved = commandeRepository.save(commande);
        notifyOrderUpdated(saved);
        return saved;
    }

    /**
     * Recalculates total price for an order based on its current item list.
     *
     * @param commande Order entity
     */
    public void recalculateTotal(Commande commande) {
        if (commande == null) return;
        BigDecimal total = BigDecimal.ZERO;
        if (commande.getItems() != null) {
            for (CommandeItem item : commande.getItems()) {
                if (item.getPrixUnitaire() != null) {
                    BigDecimal itemTotal = item.getPrixUnitaire()
                            .multiply(BigDecimal.valueOf(item.getQuantite()));
                    total = total.add(itemTotal);
                }
            }
        }
        commande.setTotal(total);
    }

    private void destockerIngredients(Commande commande) {
        Map<Long, BigDecimal> quantitesParIngredient = calculerQuantitesIngredients(commande);
        Map<Long, Ingredient> ingredientsMap = mepIngredients(commande);

        for (Map.Entry<Long, BigDecimal> entry : quantitesParIngredient.entrySet()) {
            Ingredient ingredient = ingredientsMap.get(entry.getKey());
            if (ingredient == null) {
                ingredient = ingredientRepository.findById(entry.getKey()).orElse(null);
            }
            if (ingredient == null) {
                continue;
            }
            BigDecimal currentStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock()
                    : BigDecimal.ZERO;
            BigDecimal rawNouveauStock = currentStock.subtract(entry.getValue());
            boolean stockNegatif = rawNouveauStock.compareTo(BigDecimal.ZERO) < 0;
            BigDecimal nouveauStock = rawNouveauStock.max(BigDecimal.ZERO);
            ingredient.setQuantiteStock(nouveauStock);
            ingredient.setUpdatedAt(timeService.now());
            ingredientRepository.save(ingredient);
            if (ingredient.getSeuilAlerte() != null
                    && (nouveauStock.compareTo(ingredient.getSeuilAlerte()) <= 0 || stockNegatif)
                    && eventPublisher != null) {
                try {
                    eventPublisher.publishEvent(new StockAlertEvent(
                            ingredient.getId(),
                            ingredient.getNom(),
                            nouveauStock.doubleValue()));
                } catch (Exception ex) {
                    log.warn("Failed to publish StockAlertEvent: {}", ex.getMessage());
                }
            }
        }
    }

    private void reincrementerStockIngredients(Commande commande) {
        Map<Long, BigDecimal> quantitesParIngredient = calculerQuantitesIngredients(commande);
        Map<Long, Ingredient> ingredientsMap = mepIngredients(commande);

        for (Map.Entry<Long, BigDecimal> entry : quantitesParIngredient.entrySet()) {
            Ingredient ingredient = ingredientsMap.get(entry.getKey());
            if (ingredient == null) {
                ingredient = ingredientRepository.findById(entry.getKey()).orElse(null);
            }
            if (ingredient == null) {
                continue;
            }
            BigDecimal currentStock = ingredient.getQuantiteStock() != null ? ingredient.getQuantiteStock()
                    : BigDecimal.ZERO;
            BigDecimal nouveauStock = currentStock.add(entry.getValue());
            ingredient.setQuantiteStock(nouveauStock);
            ingredient.setUpdatedAt(timeService.now());
            ingredientRepository.save(ingredient);
        }
    }

    private Map<Long, BigDecimal> calculerQuantitesIngredients(Commande commande) {
        Map<Long, BigDecimal> quantites = new HashMap<>();
        if (commande.getItems() == null) {
            return quantites;
        }
        for (CommandeItem item : commande.getItems()) {
            traiterQuantitesItem(quantites, item);
        }
        return quantites;
    }

    private void traiterQuantitesItem(Map<Long, BigDecimal> quantites, CommandeItem item) {
        if (item.getCocktail() == null || item.getCocktail().getId() == null) {
            return;
        }
        if (traiterQuantitesVariante(quantites, item)) {
            return;
        }
        traiterQuantitesBaseCocktail(quantites, item);
    }

    private boolean traiterQuantitesVariante(Map<Long, BigDecimal> quantites, CommandeItem item) {
        if (item.getVariante() == null || item.getVariante().getIngredients() == null || item.getVariante().getIngredients().isEmpty()) {
            return false;
        }
        for (CocktailVarianteIngredient cvi : item.getVariante().getIngredients()) {
            Ingredient ingredient = cvi.getIngredient();
            if (ingredient != null && ingredient.getId() != null && cvi.getQuantite() != null) {
                BigDecimal qte = cvi.getQuantite().multiply(BigDecimal.valueOf(item.getQuantite()));
                BigDecimal existent = quantites.get(ingredient.getId());
                quantites.put(ingredient.getId(), existent != null ? existent.add(qte) : qte);
            }
        }
        return true;
    }

    private void traiterQuantitesBaseCocktail(Map<Long, BigDecimal> quantites, CommandeItem item) {
        List<CocktailIngredient> ingredientsList = resolveCocktailIngredients(item.getCocktail());
        if (ingredientsList == null || ingredientsList.isEmpty()) {
            return;
        }
        BigDecimal mult = (item.getVariante() != null && item.getVariante().getMultiplicateurIngredient() != null)
                ? item.getVariante().getMultiplicateurIngredient()
                : BigDecimal.ONE;

        for (CocktailIngredient ci : ingredientsList) {
            traiterQuantiteIngredient(quantites, item, ci, mult);
        }
    }

    private List<CocktailIngredient> resolveCocktailIngredients(Cocktail cocktail) {
        List<CocktailIngredient> ingredientsList = null;
        if (cocktailIngredientRepository != null) {
            try {
                ingredientsList = cocktailIngredientRepository.findByCocktail(cocktail);
            } catch (Exception _) {
                // Fallback to navigation
            }
        }
        if (ingredientsList == null || ingredientsList.isEmpty()) {
            ingredientsList = cocktail.getIngredients();
        }
        return ingredientsList;
    }

    private void traiterQuantiteIngredient(Map<Long, BigDecimal> quantites, CommandeItem item, CocktailIngredient ci,
            BigDecimal mult) {
        Ingredient ingredient = ci.getIngredient();
        if (ingredient != null && ingredient.getId() != null && ci.getQuantite() != null) {
            BigDecimal qte = ci.getQuantite()
                    .multiply(BigDecimal.valueOf(item.getQuantite()))
                    .multiply(mult);
            BigDecimal existent = quantites.get(ingredient.getId());
            quantites.put(ingredient.getId(), existent != null ? existent.add(qte) : qte);
        }
    }

    private Map<Long, Ingredient> mepIngredients(Commande commande) {
        Map<Long, Ingredient> map = new HashMap<>();
        if (commande.getItems() == null) {
            return map;
        }
        for (CommandeItem item : commande.getItems()) {
            extraireIngredientsItem(map, item);
        }
        return map;
    }

    private void extraireIngredientsItem(Map<Long, Ingredient> map, CommandeItem item) {
        if (extraireIngredientsVariante(map, item)) {
            return;
        }
        extraireIngredientsBaseCocktail(map, item);
    }

    private boolean extraireIngredientsVariante(Map<Long, Ingredient> map, CommandeItem item) {
        if (item.getVariante() == null || item.getVariante().getIngredients() == null || item.getVariante().getIngredients().isEmpty()) {
            return false;
        }
        for (CocktailVarianteIngredient cvi : item.getVariante().getIngredients()) {
            if (cvi.getIngredient() != null && cvi.getIngredient().getId() != null) {
                map.put(cvi.getIngredient().getId(), cvi.getIngredient());
            }
        }
        return true;
    }

    private void extraireIngredientsBaseCocktail(Map<Long, Ingredient> map, CommandeItem item) {
        if (item.getCocktail() == null || item.getCocktail().getId() == null) {
            return;
        }
        List<CocktailIngredient> ingredientsList = resolveCocktailIngredients(item.getCocktail());
        if (ingredientsList != null) {
            for (CocktailIngredient ci : ingredientsList) {
                if (ci.getIngredient() != null && ci.getIngredient().getId() != null) {
                    map.put(ci.getIngredient().getId(), ci.getIngredient());
                }
            }
        }
    }

    /**
     * Transfers an existing order to a new target table.
     *
     * @param id         Identifier of the order to transfer
     * @param newTableId Identifier of the target table
     * @return Updated order entity
     */
    @Transactional
    public Commande transfererCommande(Long id, Long newTableId) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));
        TableEntity targetTable = tableRepository.findById(newTableId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found with id: " + newTableId));

        commande.setTable(targetTable);
        commande.setUpdatedAt(timeService.now());
        Commande saved = commandeRepository.save(commande);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new OrderUpdatedEvent(saved));
        }
        return saved;
    }

    /**
     * Modifies an active order's cocktail items, quantities, notes and recalculates
     * order total.
     *
     * @param id      Identifier of the order to modify
     * @param request Update request payload
     * @return Updated order entity
     */
    @Transactional
    public Commande modifierCommande(Long id, ModifierCommandeRequestDTO request) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));

        validateOrderModifiable(commande);

        if (commande.getStatut() == CommandeStatut.EN_PREPARATION && commande.getDatePreparation() != null) {
            reincrementerStockIngredients(commande);
        }

        resetCommandeItems(commande);

        BigDecimal total = BigDecimal.ZERO;
        for (ModifierCommandeItemDTO itemDto : request.items()) {
            CommandeItem item = createCommandeItemFromDto(commande, itemDto);
            commande.getItems().add(item);
            BigDecimal lineTotal = item.getPrixUnitaire().multiply(BigDecimal.valueOf(itemDto.quantite()));
            total = total.add(lineTotal);
        }

        commande.setTotal(total);
        if (request.notes() != null) {
            commande.setNotes(request.notes());
        }
        if (request.pourboire() != null) {
            commande.setPourboire(request.pourboire());
        }
        commande.setDateModification(timeService.now());
        commande.setUpdatedAt(timeService.now());

        if (commande.getStatut() == CommandeStatut.EN_PREPARATION && commande.getDatePreparation() != null) {
            destockerIngredients(commande);
        }

        Commande saved = commandeRepository.save(commande);
        notifyOrderUpdated(saved);
        return saved;
    }

    private void validateOrderModifiable(Commande commande) {
        if (commande.getStatut() == CommandeStatut.LIVREE
                || commande.getStatut() == CommandeStatut.REGLEE
                || commande.getStatut() == CommandeStatut.ANNULEE) {
            throw new BusinessException("Cannot modify order with status: " + commande.getStatut());
        }
    }

    private void resetCommandeItems(Commande commande) {
        if (commande.getItems() == null) {
            commande.setItems(new ArrayList<>());
        } else {
            commande.getItems().clear();
        }
    }

    private CommandeItem createCommandeItemFromDto(Commande commande, ModifierCommandeItemDTO itemDto) {
        Cocktail cocktail = cocktailRepository.findById(itemDto.cocktailId())
                .orElseThrow(
                        () -> new ResourceNotFoundException("Cocktail not found with id: " + itemDto.cocktailId()));

        BigDecimal unitPrice = cocktail.getPrix();
        CocktailVariante variante = null;
        if (itemDto.varianteId() != null) {
            variante = cocktailVarianteRepository.findById(itemDto.varianteId()).orElse(null);
            if (variante != null && variante.getPrixSupplement() != null) {
                unitPrice = unitPrice.add(variante.getPrixSupplement());
            }
        }

        if (happyHourService != null) {
            LocalDateTime orderTime = commande.getDateCommande() != null ? commande.getDateCommande() : timeService.now();
            unitPrice = happyHourService.resolveEffectivePrice(cocktail, variante, orderTime);
        }

        CommandeItem item = new CommandeItem();
        item.setCommande(commande);
        item.setCocktail(cocktail);
        item.setVariante(variante);
        item.setQuantite(itemDto.quantite());
        item.setPrixUnitaire(unitPrice);
        item.setNotes(itemDto.notes());
        item.setPrioritaire(Boolean.TRUE.equals(itemDto.prioritaire()));
        item.setStation(cocktail.getStation() != null ? cocktail.getStation() : PreparationStation.BAR);
        item.setStatut(CommandeStatut.EN_ATTENTE);
        return item;
    }

    private void updateTableOccupancyOnOrderCreation(Commande commande) {
        if (commande == null || commande.getTable() == null || commande.getTable().getId() == null) {
            return;
        }
        tableRepository.findById(commande.getTable().getId()).ifPresent(table -> {
            if (!table.isOccupee()) {
                table.setOccupee(true);
                if (commande.getServeur() != null) {
                    table.setServeurId(commande.getServeur().getId());
                }
                table.setDateOccupation(timeService.now());
                TableEntity savedTable = tableRepository.save(table);
                notifyTableUpdated(savedTable);
            }
        });
    }

    private void notifyTableUpdated(TableEntity table) {
        if (eventPublisher != null && table != null) {
            eventPublisher.publishEvent(new TableUpdatedEvent(table));
        }
    }

    private void notifyOrderUpdated(Commande saved) {
        if (eventPublisher != null && saved != null) {
            eventPublisher.publishEvent(new OrderUpdatedEvent(saved));
        }
    }

    /**
     * Updates an order item's preparation status and synchronizes the parent order's status.
     *
     * @param commandeId Order identifier
     * @param itemId Item identifier
     * @param nouveauStatut Target item preparation status
     * @return Updated order entity
     */
    @Transactional
    public Commande updateItemStatut(Long commandeId, Long itemId, CommandeStatut nouveauStatut) {
        return executeUpdateItemStatut(commandeId, itemId, nouveauStatut);
    }

    /**
     * Updates an order item's preparation status directly without specifying parent order ID.
     *
     * @param itemId Item identifier
     * @param nouveauStatut Target item preparation status
     * @return Updated order entity
     */
    @Transactional
    public Commande updateItemStatut(Long itemId, CommandeStatut nouveauStatut) {
        CommandeItem item = commandeItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found with id: " + itemId));
        if (item.getCommande() == null || item.getCommande().getId() == null) {
            throw new ResourceNotFoundException("Parent order not found for item: " + itemId);
        }
        return executeUpdateItemStatut(item.getCommande().getId(), itemId, nouveauStatut);
    }

    private Commande executeUpdateItemStatut(Long commandeId, Long itemId, CommandeStatut nouveauStatut) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));

        CommandeItem item = commande.getItems().stream()
                .filter(it -> it.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found with id: " + itemId));

        item.setStatut(nouveauStatut);
        commandeItemRepository.save(item);

        syncOrderStatusFromItems(commande, nouveauStatut);

        commande.setUpdatedAt(timeService.now());
        commande.setDateModification(timeService.now());
        Commande saved = commandeRepository.save(commande);
        notifyOrderUpdated(saved);
        return saved;
    }

    private void syncOrderStatusFromItems(Commande commande, CommandeStatut itemNewStatut) {
        if (commande.getStatut() == CommandeStatut.LIVREE
                || commande.getStatut() == CommandeStatut.REGLEE
                || commande.getStatut() == CommandeStatut.ANNULEE) {
            return;
        }

        List<CommandeItem> items = commande.getItems();
        if (items == null || items.isEmpty()) {
            return;
        }

        if (checkAdvanceToPreparation(commande, itemNewStatut)) {
            return;
        }

        checkAdvanceToReady(commande, items);
    }

    private boolean checkAdvanceToPreparation(Commande commande, CommandeStatut itemNewStatut) {
        if (itemNewStatut == CommandeStatut.EN_PREPARATION && commande.getStatut() == CommandeStatut.EN_ATTENTE) {
            CommandeStatut oldStatut = commande.getStatut();
            commande.setStatut(CommandeStatut.EN_PREPARATION);
            if (commande.getDatePreparation() == null) {
                commande.setDatePreparation(timeService.now());
                destockerIngredients(commande);
            }
            if (eventPublisher != null) {
                eventPublisher.publishEvent(new OrderStatusChangedEvent(commande.getId(), oldStatut, CommandeStatut.EN_PREPARATION, commande));
            }
            return true;
        }
        return false;
    }

    private void checkAdvanceToReady(Commande commande, List<CommandeItem> items) {
        boolean allReady = items.stream().allMatch(it ->
                it.getStatut() == CommandeStatut.PRET
                        || it.getStatut() == CommandeStatut.LIVREE
                        || it.getStatut() == CommandeStatut.ANNULEE);

        if (allReady && (commande.getStatut() == CommandeStatut.EN_ATTENTE || commande.getStatut() == CommandeStatut.EN_PREPARATION)) {
            CommandeStatut oldStatut = commande.getStatut();
            commande.setStatut(CommandeStatut.PRET);
            commande.setDatePret(timeService.now());
            if (eventPublisher != null) {
                eventPublisher.publishEvent(new OrderStatusChangedEvent(commande.getId(), oldStatut, CommandeStatut.PRET, commande));
            }
        }
    }

    /**
     * Lists active orders containing items intended for the specified workstation station.
     *
     * @param station Target preparation station (BAR, KITCHEN, SNACK)
     * @return List of active orders
     */
    @Transactional(readOnly = true)
    public List<Commande> getCommandesByStation(PreparationStation station) {
        return commandeRepository.findAll().stream()
                .filter(cmd -> cmd.getStatut() != CommandeStatut.LIVREE
                        && cmd.getStatut() != CommandeStatut.REGLEE
                        && cmd.getStatut() != CommandeStatut.ANNULEE)
                .filter(cmd -> cmd.getItems() != null && cmd.getItems().stream().anyMatch(it -> {
                    PreparationStation itemStation = it.getStation() != null ? it.getStation() : PreparationStation.BAR;
                    if (station == PreparationStation.KITCHEN) {
                        return itemStation == PreparationStation.KITCHEN || itemStation == PreparationStation.SNACK;
                    }
                    return itemStation == station;
                }))
                .toList();
    }
}
