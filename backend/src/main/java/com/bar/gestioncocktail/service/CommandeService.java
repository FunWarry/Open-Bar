package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CommandeService {
    private final CommandeRepository commandeRepository;
    private final CommandeItemRepository commandeItemRepository;
    private final TableRepository tableRepository;

    @Autowired
    public CommandeService(CommandeRepository commandeRepository, CommandeItemRepository commandeItemRepository, TableRepository tableRepository) {
        this.commandeRepository = commandeRepository;
        this.commandeItemRepository = commandeItemRepository;
        this.tableRepository = tableRepository;
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
                .orElseThrow(() -> new RuntimeException("Commande non trouvée avec l'id: " + id));

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
                .orElseThrow(() -> new RuntimeException("Commande non trouvée avec l'id: " + commandeId));

        item.setCommande(commande);
        commandeItemRepository.save(item);
        
        // Mise à jour du total de la commande
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
                .orElseThrow(() -> new RuntimeException("Commande non trouvée avec l'id: " + commandeId));

        commande.getItems().removeIf(item -> item.getId().equals(itemId));
        commande.setDateModification(LocalDateTime.now());

        return commandeRepository.save(commande);
    }

    @Transactional
    public Commande changerStatut(Long id, CommandeStatut nouveauStatut) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commande non trouvée avec l'id: " + id));

        commande.setStatut(nouveauStatut);
        commande.setUpdatedAt(LocalDateTime.now());
        
        switch (nouveauStatut) {
            case EN_PREPARATION:
                commande.setDatePreparation(LocalDateTime.now());
                break;
            case PRET:
                commande.setDateLivraison(LocalDateTime.now());
                break;
            case REGLEE:
                commande.setDateReglement(LocalDateTime.now());
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
} 