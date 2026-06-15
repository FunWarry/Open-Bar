package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CocktailVarianteRepository extends JpaRepository<CocktailVariante, Long> {
    List<CocktailVariante> findByCocktail(Cocktail cocktail);
    List<CocktailVariante> findByCocktailAndDisponible(Cocktail cocktail, boolean disponible);
    List<CocktailVariante> findByNomContainingIgnoreCase(String nom);
} 