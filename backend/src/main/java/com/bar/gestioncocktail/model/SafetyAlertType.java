package com.bar.gestioncocktail.model;

/**
 * Enumeration representing the international Angel Shot emergency assistance code variants.
 */
public enum SafetyAlertType {

    /**
     * Angel Shot Pur / Neat: Patron requires a discreet escort to their car or exit.
     */
    ANGEL_SHOT_NEAT("Angel Shot Pur", "Escorte sécurisée vers la sortie / véhicule", "Discreet escort to vehicle or exit"),

    /**
     * Angel Shot Avec Glaçons / With Ice: Patron requires staff to discreetly hail or call a taxi/ride.
     */
    ANGEL_SHOT_ICE("Angel Shot avec Glaçons", "Commande discrète d'un taxi / VTC", "Discreetly hail or order a taxi / ride"),

    /**
     * Angel Shot Avec Citron / With Lime: Immediate staff intervention required; alert security or police.
     */
    ANGEL_SHOT_LIME("Angel Shot avec Citron", "Intervention immédiate (sécurité / police)", "Immediate staff intervention / security alert");

    private final String label;
    private final String descriptionFr;
    private final String descriptionEn;

    SafetyAlertType(String label, String descriptionFr, String descriptionEn) {
        this.label = label;
        this.descriptionFr = descriptionFr;
        this.descriptionEn = descriptionEn;
    }

    public String getLabel() {
        return label;
    }

    public String getDescriptionFr() {
        return descriptionFr;
    }

    public String getDescriptionEn() {
        return descriptionEn;
    }
}
