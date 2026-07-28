package com.bar.gestioncocktail.exception;

/**
 * Exception levée lorsque le stock d'un ingrédient est insuffisant pour préparer une commande.
 */
public class StockInsuffisantException extends BusinessException {

    /**
     * Constructeur avec message d'erreur de rupture de stock.
     *
     * @param message Message décrivant le manque d'ingrédient
     */
    public StockInsuffisantException(String message) {
        super(message);
    }
}
