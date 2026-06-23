package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CocktailVarianteService {
    private final CocktailVarianteRepository cocktailVarianteRepository;

    @Autowired
    public CocktailVarianteService(CocktailVarianteRepository cocktailVarianteRepository) {
        this.cocktailVarianteRepository = cocktailVarianteRepository;
    }

    public CocktailVariante createCocktailVariante(CocktailVariante variante) {
        variante.setCreatedAt(LocalDateTime.now());
        variante.setUpdatedAt(LocalDateTime.now());
        return cocktailVarianteRepository.save(variante);
    }

    public CocktailVariante updateCocktailVariante(CocktailVariante variante) {
        variante.setUpdatedAt(LocalDateTime.now());
        return cocktailVarianteRepository.save(variante);
    }

    public void deleteCocktailVariante(Long id) {
        cocktailVarianteRepository.deleteById(id);
    }

    public Optional<CocktailVariante> getCocktailVarianteById(Long id) {
        return cocktailVarianteRepository.findById(id);
    }

    public List<CocktailVariante> getVariantesByCocktail(Cocktail cocktail) {
        return cocktailVarianteRepository.findByCocktail(cocktail);
    }

    public List<CocktailVariante> getVariantesDisponiblesByCocktail(Cocktail cocktail) {
        return cocktailVarianteRepository.findByCocktailAndDisponible(cocktail, true);
    }

    public List<CocktailVariante> searchVariantes(String nom) {
        return cocktailVarianteRepository.findByNomContainingIgnoreCase(nom);
    }

    public void toggleDisponibilite(CocktailVariante variante) {
        variante.setDisponible(!variante.isDisponible());
        variante.setUpdatedAt(LocalDateTime.now());
        cocktailVarianteRepository.save(variante);
    }

    public void updatePrixSupplement(CocktailVariante variante, BigDecimal prixSupplement) {
        variante.setPrixSupplement(prixSupplement);
        variante.setUpdatedAt(LocalDateTime.now());
        cocktailVarianteRepository.save(variante);
    }
} 