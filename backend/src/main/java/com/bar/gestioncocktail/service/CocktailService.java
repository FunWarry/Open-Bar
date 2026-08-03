package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.repository.CocktailRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service métier gérant les boissons et cocktails (catalogue, disponibilité, saisonnalité).
 */
@Service
@Transactional
public class CocktailService {
    private final CocktailRepository cocktailRepository;
    private final TimeService timeService;
    private final FileUploadService fileUploadService;

    /**
     * Constructeur avec injection des dépendances.
     *
     * @param cocktailRepository Repository JPA des cocktails
     * @param timeService Service de gestion du temps
     * @param fileUploadService Service de gestion des fichiers téléversés
     */
    public CocktailService(CocktailRepository cocktailRepository, TimeService timeService, FileUploadService fileUploadService) {
        this.cocktailRepository = cocktailRepository;
        this.timeService = timeService;
        this.fileUploadService = fileUploadService;
    }

    /**
     * Retrieves all cocktails from the menu.
     *
     * @return List of all cocktails
     */
    @Transactional(readOnly = true)
    public List<Cocktail> getAllCocktails() {
        return cocktailRepository.findAll();
    }

    /**
     * Crée et sauvegarde un nouveau cocktail.
     *
     * @param cocktail Le cocktail à créer
     * @return Le cocktail créé
     */
    public Cocktail createCocktail(Cocktail cocktail) {
        cocktail.setCreatedAt(timeService.now());
        cocktail.setUpdatedAt(timeService.now());
        return cocktailRepository.save(cocktail);
    }

    /**
     * Met à jour les informations d'un cocktail existant.
     *
     * @param cocktail Le cocktail mis à jour
     * @return Le cocktail sauvegardé
     */
    public Cocktail updateCocktail(Cocktail cocktail) {
        cocktail.setUpdatedAt(timeService.now());
        return cocktailRepository.save(cocktail);
    }


    /**
     * Supprime un cocktail par son identifiant.
     *
     * @param id Identifiant du cocktail à supprimer
     */
    public void deleteCocktail(Long id) {
        cocktailRepository.deleteById(id);
    }

    /**
     * Recherche un cocktail par son identifiant.
     *
     * @param id Identifiant
     * @return Un {@link Optional} contenant le cocktail s'il existe
     */
    public Optional<Cocktail> getCocktailById(Long id) {
        return cocktailRepository.findById(id);
    }

    /**
     * Recherche les cocktails par catégorie.
     *
     * @param categorie Catégorie (ALCOOLISE, SANS_ALCOOL, SHOT, etc.)
     * @return Liste des cocktails
     */
    public List<Cocktail> getCocktailsByCategorie(CocktailCategorie categorie) {
        return cocktailRepository.findByCategorie(categorie);
    }

    /**
     * Liste les cocktails marqués comme disponibles.
     *
     * @return Liste des cocktails disponibles
     */
    public List<Cocktail> getCocktailsDisponibles() {
        return cocktailRepository.findByDisponible(true);
    }

    /**
     * Liste les cocktails configurés comme saisonniers.
     *
     * @return Liste des cocktails saisonniers
     */
    public List<Cocktail> getCocktailsSaisonniers() {
        return cocktailRepository.findBySaisonnier(true);
    }

    /**
     * Liste les cocktails saisonniers dont la plage de date englobe la date courante.
     *
     * @return Liste des cocktails de saison actuels
     */
    public List<Cocktail> getCocktailsSaisonniersActuels() {
        LocalDateTime now = timeService.now();
        return cocktailRepository.findBySaisonnierAndDateDebutSaisonBeforeAndDateFinSaisonAfter(
            true, now, now);
    }

    /**
     * Recherche les cocktails par nom (insensible à la casse).
     *
     * @param nom Mot-clé
     * @return Liste des cocktails trouvés
     */
    public List<Cocktail> searchCocktails(String nom) {
        return cocktailRepository.findByNomContainingIgnoreCase(nom);
    }

    /**
     * Inverse l'état de disponibilité d'un cocktail.
     *
     * @param cocktail Le cocktail à modifier
     */
    public void toggleDisponibilite(Cocktail cocktail) {
        cocktail.setDisponible(!cocktail.isDisponible());
        cocktail.setUpdatedAt(timeService.now());
        cocktailRepository.save(cocktail);
    }

    /**
     * Définit la période de saisonnalité d'un cocktail par dates précis.
     *
     * @param cocktail Le cocktail
     * @param dateDebut Date de début
     * @param dateFin Date de fin
     */
    public void definirSaisonnalite(Cocktail cocktail, LocalDateTime dateDebut, LocalDateTime dateFin) {
        cocktail.setSaisonnier(true);
        cocktail.setDateDebutSaison(dateDebut);
        cocktail.setDateFinSaison(dateFin);
        cocktail.setUpdatedAt(timeService.now());
        cocktailRepository.save(cocktail);
    }

    /**
     * Met à jour la période de saisonnalité par numéro de mois (1-12).
     *
     * @param id Identifiant du cocktail
     * @param moisDebut Mois de début (1-12)
     * @param moisFin Mois de fin (1-12)
     * @return Le cocktail mis à jour
     */
    @Transactional
    public Cocktail updateSaisonnalite(Long id, Integer moisDebut, Integer moisFin) {
        Cocktail cocktail = cocktailRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cocktail non trouvé: " + id));
        cocktail.setMoisDebut(moisDebut);
        cocktail.setMoisFin(moisFin);
        cocktail.setSaisonnier(moisDebut != null && moisFin != null);
        return cocktailRepository.save(cocktail);
    }

    /**
     * Stores a new photo for a cocktail and updates its photoUrl attribute.
     *
     * @param id   Identifier of the target cocktail
     * @param file Multipart image file uploaded by user
     * @return Updated cocktail entity
     */
    @Transactional
    public Cocktail updateCocktailImage(Long id, MultipartFile file) {
        Cocktail cocktail = cocktailRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cocktail non trouvé: " + id));

        String photoUrl = fileUploadService.storeCocktailPhoto(id, file);
        cocktail.setImageUrl(photoUrl);
        cocktail.setUpdatedAt(timeService.now());
        return cocktailRepository.save(cocktail);
    }
}