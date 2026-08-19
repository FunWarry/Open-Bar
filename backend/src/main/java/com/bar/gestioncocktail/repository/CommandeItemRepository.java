package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CommandeItemRepository extends JpaRepository<CommandeItem, Long> {
    List<CommandeItem> findByCommande(Commande commande);
    List<CommandeItem> findByCocktail(Cocktail cocktail);
    List<CommandeItem> findByVariante(CocktailVariante variante);
    List<CommandeItem> findByPrioritaire(boolean prioritaire);
    List<CommandeItem> findByCommandeAndPrioritaire(Commande commande, boolean prioritaire);

    @Modifying
    @Query("UPDATE CommandeItem ci SET ci.variante = null WHERE ci.variante.id IN :varianteIds")
    void nullifyVarianteForIds(@Param("varianteIds") Collection<Long> varianteIds);
} 