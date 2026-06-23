package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommandeItemRepository extends JpaRepository<CommandeItem, Long> {
    List<CommandeItem> findByCommande(Commande commande);
    List<CommandeItem> findByCocktail(Cocktail cocktail);
    List<CommandeItem> findByVariante(CocktailVariante variante);
    List<CommandeItem> findByPrioritaire(boolean prioritaire);
    List<CommandeItem> findByCommandeAndPrioritaire(Commande commande, boolean prioritaire);
} 