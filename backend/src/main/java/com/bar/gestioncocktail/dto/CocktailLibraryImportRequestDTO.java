package com.bar.gestioncocktail.dto;

import java.util.List;

/**
 * Request payload for importing selected cocktail recipes from the library into the active catalog.
 *
 * @param cocktailIds   List of library cocktail identifiers to import (e.g. ["lib_1", "lib_2"])
 * @param cocktailNames Optional list of library cocktail names to import (e.g. ["Mojito", "Negroni"])
 */
public record CocktailLibraryImportRequestDTO(
        List<String> cocktailIds,
        List<String> cocktailNames
) {
    public CocktailLibraryImportRequestDTO {
        if ((cocktailIds == null || cocktailIds.isEmpty()) && (cocktailNames == null || cocktailNames.isEmpty())) {
            throw new IllegalArgumentException("At least one cocktail identifier or name must be specified for import.");
        }
    }

    /**
     * Convenience constructor accepting only cocktail library IDs.
     *
     * @param cocktailIds List of library IDs
     */
    public CocktailLibraryImportRequestDTO(List<String> cocktailIds) {
        this(cocktailIds, null);
    }
}
