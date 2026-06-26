package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.repository.CocktailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CocktailService {
    private final CocktailRepository cocktailRepository;

    @Autowired
    public CocktailService(CocktailRepository cocktailRepository) {
        this.cocktailRepository = cocktailRepository;
    }

    public Cocktail createCocktail(Cocktail cocktail) {
        cocktail.setCreatedAt(LocalDateTime.now());
        cocktail.setUpdatedAt(LocalDateTime.now());
        return cocktailRepository.save(cocktail);
    }

    public Cocktail updateCocktail(Cocktail cocktail) {
        cocktail.setUpdatedAt(LocalDateTime.now());
        return cocktailRepository.save(cocktail);
    }

    public void deleteCocktail(Long id) {
        cocktailRepository.deleteById(id);
    }

    public Optional<Cocktail> getCocktailById(Long id) {
        return cocktailRepository.findById(id);
    }

    public List<Cocktail> getCocktailsByCategorie(CocktailCategorie categorie) {
        return cocktailRepository.findByCategorie(categorie);
    }

    public List<Cocktail> getCocktailsDisponibles() {
        return cocktailRepository.findByDisponible(true);
    }

    public List<Cocktail> getCocktailsSaisonniers() {
        return cocktailRepository.findBySaisonnier(true);
    }

    public List<Cocktail> getCocktailsSaisonniersActuels() {
        LocalDateTime now = LocalDateTime.now();
        return cocktailRepository.findBySaisonnierAndDateDebutSaisonBeforeAndDateFinSaisonAfter(
            true, now, now);
    }

    public List<Cocktail> searchCocktails(String nom) {
        return cocktailRepository.findByNomContainingIgnoreCase(nom);
    }

    public void toggleDisponibilite(Cocktail cocktail) {
        cocktail.setDisponible(!cocktail.isDisponible());
        cocktail.setUpdatedAt(LocalDateTime.now());
        cocktailRepository.save(cocktail);
    }

    public void definirSaisonnalite(Cocktail cocktail, LocalDateTime dateDebut, LocalDateTime dateFin) {
        cocktail.setSaisonnier(true);
        cocktail.setDateDebutSaison(dateDebut);
        cocktail.setDateFinSaison(dateFin);
        cocktail.setUpdatedAt(LocalDateTime.now());
        cocktailRepository.save(cocktail);
    }

    @Transactional
    public Cocktail updateSaisonnalite(Long id, Integer moisDebut, Integer moisFin) {
        Cocktail cocktail = cocktailRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cocktail non trouvé: " + id));
        cocktail.setMoisDebut(moisDebut);
        cocktail.setMoisFin(moisFin);
        cocktail.setSaisonnier(moisDebut != null && moisFin != null);
        return cocktailRepository.save(cocktail);
    }
} 