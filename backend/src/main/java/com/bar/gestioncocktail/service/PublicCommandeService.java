package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.exception.StockInsuffisantException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PublicCommandeService {

    private final CommandeRepository commandeRepository;
    private final TableRepository tableRepository;
    private final CocktailRepository cocktailRepository;
    private final CocktailVarianteRepository varianteRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public PublicCommandeService(
            CommandeRepository commandeRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.commandeRepository = commandeRepository;
        this.tableRepository = tableRepository;
        this.cocktailRepository = cocktailRepository;
        this.varianteRepository = varianteRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public PublicCommandeResponseDTO creerCommandePublique(PublicCommandeRequestDTO dto) {
        TableEntity table = tableRepository.findById(dto.getTableId())
                .orElseThrow(() -> new ResourceNotFoundException("Table non trouvée avec l'id: " + dto.getTableId()));

        Commande commande = new Commande();
        commande.setTable(table);
        commande.setNotes(dto.getNotes());
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setDateCommande(LocalDateTime.now());
        commande.setTrackingToken(UUID.randomUUID().toString());

        List<CommandeItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (PublicCommandeItemRequestDTO itemDto : dto.getItems()) {
            Cocktail cocktail = cocktailRepository.findById(itemDto.getCocktailId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cocktail non trouvé avec l'id: " + itemDto.getCocktailId()));

            CocktailVariante variante = null;
            if (itemDto.getVarianteId() != null) {
                variante = varianteRepository.findById(itemDto.getVarianteId())
                        .orElseThrow(() -> new ResourceNotFoundException("Variante non trouvée avec l'id: " + itemDto.getVarianteId()));
            }

            BigDecimal prixUnitaire = cocktail.getPrix();
            if (variante != null && variante.getPrixSupplement() != null) {
                prixUnitaire = prixUnitaire.add(variante.getPrixSupplement());
            }

            // Vérification simple du stock si disponible
            if (cocktail.getIngredients() != null) {
                for (CocktailIngredient ci : cocktail.getIngredients()) {
                    Ingredient ing = ci.getIngredient();
                    if (ing != null && ing.getQuantiteStock() != null) {
                        BigDecimal besoin = ci.getQuantite().multiply(BigDecimal.valueOf(itemDto.getQuantite()));
                        if (ing.getQuantiteStock().compareTo(besoin) < 0) {
                            throw new StockInsuffisantException("Stock insuffisant pour l'ingrédient: " + ing.getNom());
                        }
                    }
                }
            }

            CommandeItem item = new CommandeItem();
            item.setCommande(commande);
            item.setCocktail(cocktail);
            item.setVariante(variante);
            item.setQuantite(itemDto.getQuantite());
            item.setPrixUnitaire(prixUnitaire);
            item.setNotes(itemDto.getNotes());

            items.add(item);
            total = total.add(prixUnitaire.multiply(BigDecimal.valueOf(itemDto.getQuantite())));
        }

        commande.setItems(items);
        commande.setTotal(total);

        Commande savedCommande = commandeRepository.save(commande);

        // Mettre la table en occupée si libre
        if (!table.isOccupee()) {
            table.setOccupee(true);
            table.setDateOccupation(LocalDateTime.now());
            tableRepository.save(table);
        }

        // Broadcaster les notifications STOMP
        messagingTemplate.convertAndSend("/topic/barman/commandes", CommandeResponseDTO.from(savedCommande));
        messagingTemplate.convertAndSend("/topic/commandes/" + savedCommande.getTrackingToken(), PublicCommandeResponseDTO.from(savedCommande, 10));

        long pendingCount = commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE);
        int tempsEstime = (int) (5 + (pendingCount * 3));

        return PublicCommandeResponseDTO.from(savedCommande, tempsEstime);
    }

    @Transactional(readOnly = true)
    public PublicCommandeResponseDTO getCommandeParTrackingToken(String trackingToken) {
        Commande commande = commandeRepository.findByTrackingToken(trackingToken)
                .orElseThrow(() -> new ResourceNotFoundException("Commande non trouvée pour le token: " + trackingToken));

        int tempsEstime = 0;
        if (commande.getStatut() == CommandeStatut.EN_ATTENTE) {
            long pendingCount = commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE);
            tempsEstime = (int) (5 + (pendingCount * 3));
        } else if (commande.getStatut() == CommandeStatut.EN_PREPARATION) {
            tempsEstime = 3;
        }

        return PublicCommandeResponseDTO.from(commande, tempsEstime);
    }
}
