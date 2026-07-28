package com.bar.gestioncocktail.exception;

/**
 * Exception levée lorsqu'une ressource demandée n'existe pas en base de données (mappée vers HTTP 404 Not Found par {@link GlobalExceptionHandler}).
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Constructeur avec message direct.
     *
     * @param message Message d'erreur
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }

    /**
     * Constructeur formaté pour une ressource identifiée par son ID.
     *
     * @param resourceName Nom du type de ressource (ex: "Commande", "Table")
     * @param id Identifiant de la ressource
     */
    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " #" + id + " introuvable");
    }

    /**
     * Constructeur formaté pour une ressource identifiée par un champ spécifique.
     *
     * @param resourceName Nom du type de ressource
     * @param fieldName Nom du champ de recherche
     * @param value Valeur recherchée
     */
    public ResourceNotFoundException(String resourceName, String fieldName, Object value) {
        super(resourceName + " avec " + fieldName + " = '" + value + "' introuvable");
    }
}
