package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.StockAlerteEvent;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class CommandeService {
    private static final String COMMANDE_NOT_FOUND = "Commande non trouvée avec l'id: ";

    private final CommandeRepository commandeRepository;
    private final CommandeItemRepository commandeItemRepository;
    private final IngredientRepository ingredientRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final TimeService timeService;

    public CommandeService(
            CommandeRepository commandeRepository,
            CommandeItemRepository commandeItemRepository,
            IngredientRepository ingredientRepository,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService) {
        this.commandeRepository = commandeRepository;
        this.commandeItemRepository = commandeItemRepository;
        this.ingredientRepository = ingredientRepository;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
    }

    public List<Commande> getAllCommandes() {
        return commandeRepository.findAll();
    }

    public Optional<Commande> getCommandeById(Long id) {
        return commandeRepository.findById(id);
    }

    public List<Commande> getCommandesByTable(TableEntity table) {
        return commandeRepository.findByTable(table);
    }

    public List<Commande> getCommandesByServeur(User serveur) {
        return commandeRepository.findByServeur(serveur);
    }

    public List<Commande> getCommandesByStatut(CommandeStatut statut) {
        return commandeRepository.findByStatut(statut);
    }

    public List<Commande> getCommandesByTableAndStatut(TableEntity table, CommandeStatut statut) {
        return commandeRepository.findByTableAndStatut(table, statut);
    }

    public List<Commande> getCommandesByDate(LocalDateTime debut, LocalDateTime fin) {
        return commandeRepository.findByDateCommandeBetween(debut, fin);
    }

    @Transactional
    public Commande createCommande(Commande commande) {
        commande.setCreatedAt(timeService.now());
        commande.setUpdatedAt(timeService.now());
        commande.setDateCommande(timeService.now());
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande updateCommande(Long id, Commande commandeDetails) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));

        commande.setTable(commandeDetails.getTable());
        commande.setItems(commandeDetails.getItems());
        commande.setStatut(commandeDetails.getStatut());
        commande.setNotes(commandeDetails.getNotes());
        commande.setUpdatedAt(timeService.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public void deleteCommande(Long id) {
        commandeRepository.deleteById(id);
    }

    @Transactional
    public Commande ajouterItem(Long commandeId, CommandeItem item) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));

        item.setCommande(commande);
        commandeItemRepository.save(item);

        BigDecimal total = BigDecimal.ZERO;
        if (commande.getItems() != null) {
            for (CommandeItem commandeItem : commande.getItems()) {
                if (commandeItem.getPrixUnitaire() != null) {
                    BigDecimal itemTotal = commandeItem.getPrixUnitaire()
                            .multiply(BigDecimal.valueOf(commandeItem.getQuantite()));
                    total = total.add(itemTotal);
                }
            }
        }


        commande.setTotal(total);
        commande.setDateModification(timeService.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande retirerItem(Long commandeId, Long itemId) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + commandeId));

        commande.getItems().removeIf(item -> item.getId().equals(itemId));
        commande.setDateModification(timeService.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande changerStatut(Long id, CommandeStatut nouveauStatut) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(COMMANDE_NOT_FOUND + id));

        commande.setStatut(nouveauStatut);
        commande.setUpdatedAt(timeService.now());

        switch (nouveauStatut) {
            case EN_PREPARATION:
                // Idempotence : ne déstocke qu'une seule fois, même en cas de retry ou de
                // réactivation depuis ANNULEE
                if (commande.getDatePreparation() == null) {
                    commande.setDatePreparation(timeService.now());
                    destockerIngredients(commande);
                }
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

        return commandeRepository.save(commande);
    }

    @Transactional
    public void annulerCommande(Commande commande) {
        if (commande.getStatut() != CommandeStatut.ANNULEE && commande.getDatePreparation() != null) {
            reincrementerStockIngredients(commande);
        }
        commande.setStatut(CommandeStatut.ANNULEE);
        commande.setUpdatedAt(timeService.now());
        commandeRepository.save(commande);
    }

    public void definirPriorite(CommandeItem item, boolean prioritaire) {
        item.setPrioritaire(prioritaire);
        commandeItemRepository.save(item);
    }

    private void destockerIngredients(Commande commande) {
        Map<Long, BigDecimal> quantitesParIngredient = calculerQuantitesIngredients(commande);
        Map<Long, Ingredient> ingredientsMap = mepIngredients(commande);

        for (Map.Entry<Long, BigDecimal> entry : quantitesParIngredient.entrySet()) {
            Ingredient ingredient = ingredientsMap.get(entry.getKey());
            BigDecimal nouveauStock = ingredient.getQuantiteStock().subtract(entry.getValue());
            ingredient.setQuantiteStock(nouveauStock);
            ingredient.setUpdatedAt(timeService.now());
            ingredientRepository.save(ingredient);
            if (ingredient.getSeuilAlerte() != null && nouveauStock.compareTo(ingredient.getSeuilAlerte()) <= 0) {
                messagingTemplate.convertAndSend("/topic/stock/alerte",
                        new StockAlerteEvent(
                                ingredient.getId(),
                                ingredient.getNom(),
                                ingredient.getUniteMesure(),
                                nouveauStock,
                                ingredient.getSeuilAlerte(),
                                nouveauStock.compareTo(BigDecimal.ZERO) < 0));
            }
        }
    }

    private void reincrementerStockIngredients(Commande commande) {
        Map<Long, BigDecimal> quantitesParIngredient = calculerQuantitesIngredients(commande);
        Map<Long, Ingredient> ingredientsMap = mepIngredients(commande);

        for (Map.Entry<Long, BigDecimal> entry : quantitesParIngredient.entrySet()) {
            Ingredient ingredient = ingredientsMap.get(entry.getKey());
            BigDecimal nouveauStock = ingredient.getQuantiteStock().add(entry.getValue());
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
        if (item.getCocktail() == null || item.getCocktail().getIngredients() == null) {
            return;
        }
        BigDecimal mult = (item.getVariante() != null && item.getVariante().getMultiplicateurIngredient() != null)
                ? item.getVariante().getMultiplicateurIngredient()
                : BigDecimal.ONE;

        for (CocktailIngredient ci : item.getCocktail().getIngredients()) {
            traiterQuantiteIngredient(quantites, item, ci, mult);
        }
    }

    private void traiterQuantiteIngredient(Map<Long, BigDecimal> quantites, CommandeItem item, CocktailIngredient ci, BigDecimal mult) {
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
        for (CommandeItem item : commande.getItems()) {
            if (item.getCocktail() != null && item.getCocktail().getIngredients() != null) {
                for (CocktailIngredient ci : item.getCocktail().getIngredients()) {
                    if (ci.getIngredient() != null) {
                        map.put(ci.getIngredient().getId(), ci.getIngredient());
                    }
                }
            }
        }
        return map;
    }
}
