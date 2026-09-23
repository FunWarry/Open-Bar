package com.bar.gestioncocktail.model;

/**
 * Standard measurement unit systems supported by OpenBar for recipes, inventory, and procurement.
 */
public enum UnitSystem {
    /**
     * Metric bar standard widely used in France and continental Europe (volume in cl/L, mass in g/kg).
     */
    METRIC_CL,

    /**
     * International metric SI standard used in molecular mixology and global hospitality (volume in ml/L, mass in g/kg).
     */
    METRIC_ML,

    /**
     * Imperial and US customary standard used in American and British bars (volume in fl oz, mass in oz/lb).
     */
    IMPERIAL_US,

    /**
     * Custom tailored unit system with individual volume and weight unit configurations.
     */
    CUSTOM
}
