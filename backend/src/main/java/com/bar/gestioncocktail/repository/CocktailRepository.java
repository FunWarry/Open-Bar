package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CocktailRepository extends JpaRepository<Cocktail, Long> {
    List<Cocktail> findByCategorie(CocktailCategorie categorie);
    List<Cocktail> findByDisponible(boolean disponible);
    List<Cocktail> findBySaisonnier(boolean saisonnier);
    List<Cocktail> findBySaisonnierAndDateDebutSaisonBeforeAndDateFinSaisonAfter(
        boolean saisonnier, LocalDateTime date, LocalDateTime date2);
    List<Cocktail> findByNomContainingIgnoreCase(String nom);
} 