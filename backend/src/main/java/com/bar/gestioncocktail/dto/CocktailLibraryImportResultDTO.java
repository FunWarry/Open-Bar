package com.bar.gestioncocktail.dto;

import java.util.List;

/**
 * Result report returned after batch importing recipes from the library into the active catalog and inventory.
 *
 * @param importedCount          Number of new cocktails successfully imported into catalog
 * @param skippedCount           Number of requested cocktails skipped (already present in catalog)
 * @param newIngredientsCount    Number of new ingredients added to inventory
 * @param reusedIngredientsCount Number of existing inventory ingredients linked without duplicate creation
 * @param importedCocktails      List of names of imported cocktails
 * @param skippedCocktails       List of names of skipped cocktails
 * @param message                Descriptive summary message of the import operation
 */
public record CocktailLibraryImportResultDTO(
        int importedCount,
        int skippedCount,
        int newIngredientsCount,
        int reusedIngredientsCount,
        List<String> importedCocktails,
        List<String> skippedCocktails,
        String message
) {
}
