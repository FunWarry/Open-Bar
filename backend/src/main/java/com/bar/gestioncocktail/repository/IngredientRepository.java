package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    List<Ingredient> findByQuantiteStockLessThanEqual(BigDecimal seuilAlerte);
    List<Ingredient> findByNomContainingIgnoreCase(String nom);
    List<Ingredient> findByFournisseur(String fournisseur);
    List<Ingredient> findByUniteMesure(String uniteMesure);
} 