package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.dto.TopCocktailDTO;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommandeRepository extends JpaRepository<Commande, Long> {
    List<Commande> findByTable(TableEntity table);
    List<Commande> findByServeur(User serveur);
    List<Commande> findByStatut(CommandeStatut statut);
    List<Commande> findByTableAndStatut(TableEntity table, CommandeStatut statut);
    List<Commande> findByDateCommandeBetween(LocalDateTime debut, LocalDateTime fin);
    List<Commande> findByStatutAndDateCommandeBefore(CommandeStatut statut, LocalDateTime date);
    Optional<Commande> findByTrackingToken(String trackingToken);

    long countByStatut(CommandeStatut statut);

    @Query("SELECT COALESCE(SUM(c.total), 0) FROM Commande c WHERE c.statut = :statut AND c.dateCommande >= :depuis")
    BigDecimal sumTotalByStatutAndDateCommandeAfter(@Param("statut") CommandeStatut statut, @Param("depuis") LocalDateTime depuis);

    @Query("SELECT new com.bar.gestioncocktail.dto.TopCocktailDTO(ci.cocktail.id, ci.cocktail.nom, COUNT(ci)) " +
           "FROM CommandeItem ci " +
           "GROUP BY ci.cocktail.id, ci.cocktail.nom " +
           "ORDER BY COUNT(ci) DESC")
    List<TopCocktailDTO> findTopCocktails(Pageable pageable);
}
