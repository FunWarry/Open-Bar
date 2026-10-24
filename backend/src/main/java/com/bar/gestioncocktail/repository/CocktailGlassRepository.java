package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.CocktailGlass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for cocktail glassware assignments persistence.
 */
@Repository
public interface CocktailGlassRepository extends JpaRepository<CocktailGlass, Long> {
    List<CocktailGlass> findByCocktailIdOrderByGlassOrderAsc(Long cocktailId);
    void deleteByCocktailId(Long cocktailId);
}
