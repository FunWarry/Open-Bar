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
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final CommandeRepository commandeRepository;
    private final CommandeItemRepository commandeItemRepository;
    private final TableRepository tableRepository;
    private final IngredientRepository ingredientRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public CommandeService(
            CommandeRepository commandeRepository,
            CommandeItemRepository commandeItemRepository,
            TableRepository tableRepository,
            IngredientRepository ingredientRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.commandeRepository = commandeRepository;
        this.commandeItemRepository = commandeItemRepository;
        this.tableRepository = tableRepository;
        this.ingredientRepository = ingredientRepository;
        this.messagingTemplate = messagingTemplate;
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
        commande.setCreatedAt(LocalDateTime.now());
        commande.setUpdatedAt(LocalDateTime.now());
        commande.setDateCommande(LocalDateTime.now());
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande updateCommande(Long id, Commande commandeDetails) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Commande non trouvée avec l'id: " + id));

        commande.setTable(commandeDetails.getTable());
        commande.setItems(commandeDetails.getItems());
        commande.setStatut(commandeDetails.getStatut());
        commande.setNotes(commandeDetails.getNotes());
        commande.setUpdatedAt(LocalDateTime.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public void deleteCommande(Long id) {
        commandeRepository.deleteById(id);
    }

    @Transactional
    public Commande ajouterItem(Long commandeId, CommandeItem item) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande non trouvée avec l'id: " + commandeId));

        item.setCommande(commande);
        commandeItemRepository.save(item);

        BigDecimal total = commande.getItems().stream()
            .map(commandeItem -> commandeItem.getPrixUnitaire().multiply(new BigDecimal(commandeItem.getQuantite())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        commande.setTotal(total);
        commande.setDateModification(LocalDateTime.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande retirerItem(Long commandeId, Long itemId) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande non trouvée avec l'id: " + commandeId));

        commande.getItems().removeIf(item -> item.getId().equals(itemId));
        commande.setDateModification(LocalDateTime.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande changerStatut(Long id, CommandeStatut nouveauStatut) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Commande non trouvée avec l'id: " + id));

        CommandeStatut ancienStatut = commande.getStatut();
        commande.setStatut(nouveauStatut);
        commande.setUpdatedAt(LocalDateTime.now());

        switch (nouveauStatut) {
            case EN_PREPARATION:
                // Idempotence : ne déstocke qu'une seule fois, même en cas de retry ou de réactivation depuis ANNULEE
                if (commande.getDatePreparation() == null) {
                    commande.setDatePreparation(LocalDateTime.now());
                    destockerIngredients(commande);
                }
                break;
            case LIVREE:
                commande.setDateLivraison(LocalDateTime.now());
                break;
            case REGLEE:
                commande.setDateReglement(LocalDateTime.now());
                break;
            default:
                break;
        }

        return commandeRepository.save(commande);
    }

    public void annulerCommande(Commande commande) {
        commande.setStatut(CommandeStatut.ANNULEE);
        commande.setUpdatedAt(LocalDateTime.now());
        commandeRepository.save(commande);
    }

    public void definirPriorite(CommandeItem item, boolean prioritaire) {
        item.setPrioritaire(prioritaire);
        commandeItemRepository.save(item);
    }

    // Appelé uniquement lors du premier passage EN_PREPARATION (consommation physique réelle).
    // Ne bloque pas la préparation si stock insuffisant — publie une alerte WebSocket à la place.
    // Les quantités sont agrégées par ingrédient avant sauvegarde pour éviter les doubles déstockages
    // quand un même ingrédient apparaît dans plusieurs cocktails de la même commande.
    private void destockerIngredients(Commande commande) {
        Map<Long, BigDecimal> quantitesParIngredient = new HashMap<>();
        Map<Long, Ingredient> ingredientsMap = new HashMap<>();

        for (CommandeItem item : commande.getItems()) {
            for (CocktailIngredient ci : item.getCocktail().getIngredients()) {
                Ingredient ingredient = ci.getIngredient();
                BigDecimal qte = ci.getQuantite().multiply(BigDecimal.valueOf(item.getQuantite()));
                quantitesParIngredient.merge(ingredient.getId(), qte, BigDecimal::add);
                ingredientsMap.put(ingredient.getId(), ingredient);
            }
        }

        for (Map.Entry<Long, BigDecimal> entry : quantitesParIngredient.entrySet()) {
            Ingredient ingredient = ingredientsMap.get(entry.getKey());
            BigDecimal nouveauStock = ingredient.getQuantiteStock().subtract(entry.getValue());
            ingredient.setQuantiteStock(nouveauStock);
            ingredient.setUpdatedAt(LocalDateTime.now());
            ingredientRepository.save(ingredient);
            if (ingredient.getSeuilAlerte() != null && nouveauStock.compareTo(ingredient.getSeuilAlerte()) <= 0) {
                messagingTemplate.convertAndSend("/topic/stock/alerte",
                    new StockAlerteEvent(
                        ingredient.getId(),
                        ingredient.getNom(),
                        ingredient.getUniteMesure(),
                        nouveauStock,
                        ingredient.getSeuilAlerte(),
                        nouveauStock.compareTo(BigDecimal.ZERO) < 0
                    ));
            }
        }
    }
}
