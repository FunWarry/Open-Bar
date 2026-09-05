package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.exception.StockInsuffisantException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final ApplicationEventPublisher eventPublisher;
    private final TimeService timeService;

    public PublicCommandeService(
            CommandeRepository commandeRepository,
            TableRepository tableRepository,
            CocktailRepository cocktailRepository,
            CocktailVarianteRepository varianteRepository,
            ApplicationEventPublisher eventPublisher,
            TimeService timeService) {
        this.commandeRepository = commandeRepository;
        this.tableRepository = tableRepository;
        this.cocktailRepository = cocktailRepository;
        this.varianteRepository = varianteRepository;
        this.eventPublisher = eventPublisher;
        this.timeService = timeService;
    }

    public PublicCommandeResponseDTO creerCommandePublique(PublicCommandeRequestDTO dto) {
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
        Cocktail cocktail = cocktailRepository.findById(itemDto.getCocktailId())
                .orElseThrow(() -> new ResourceNotFoundException("Cocktail not found with id: " + itemDto.getCocktailId()));

        CocktailVariante variante = null;
        if (itemDto.getVarianteId() != null) {
            variante = varianteRepository.findById(itemDto.getVarianteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found with id: " + itemDto.getVarianteId()));
        }

        BigDecimal prixUnitaire = cocktail.getPrix();
        if (variante != null && variante.getPrixSupplement() != null) {
            prixUnitaire = prixUnitaire.add(variante.getPrixSupplement());
        }

        verifierDisponibiliteIngredients(cocktail, itemDto.getQuantite());

        CommandeItem item = new CommandeItem();
        item.setCommande(commande);
        item.setCocktail(cocktail);
        item.setVariante(variante);
        item.setQuantite(itemDto.getQuantite());
        item.setPrixUnitaire(prixUnitaire);
        item.setNotes(itemDto.getNotes());
        return item;
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
}
