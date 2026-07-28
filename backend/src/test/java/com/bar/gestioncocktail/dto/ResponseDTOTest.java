package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ResponseDTOTest {

    @Test
    @DisplayName("UserResponseDTO.from - should map User entity to UserResponseDTO")
    void userResponseDTO_from() {
        User user = new User();
        user.setId(1L);
        user.setUsername("john");
        user.setEmail("john@example.com");
        user.setNom("Doe");
        user.setPrenom("John");
        user.setRoles(Set.of(UserRole.ADMIN));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        UserResponseDTO dto = UserResponseDTO.from(user);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.username()).isEqualTo("john");
        assertThat(dto.email()).isEqualTo("john@example.com");
        assertThat(dto.roles()).contains(UserRole.ADMIN);
    }

    @Test
    @DisplayName("CocktailResponseDTO.from - should map Cocktail entity to CocktailResponseDTO")
    void cocktailResponseDTO_from() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(2L);
        cocktail.setNom("Mojito");
        cocktail.setDescription("Classic mint cocktail");
        cocktail.setPrix(new BigDecimal("8.50"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail.setDisponible(true);
        cocktail.setSaisonnier(false);

        CocktailResponseDTO dto = CocktailResponseDTO.from(cocktail);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(2L);
        assertThat(dto.nom()).isEqualTo("Mojito");
        assertThat(dto.prix()).isEqualByComparingTo(new BigDecimal("8.50"));
    }

    @Test
    @DisplayName("IngredientResponseDTO.from - should map Ingredient entity to IngredientResponseDTO")
    void ingredientResponseDTO_from() {
        Ingredient ingredient = new Ingredient();
        ingredient.setId(3L);
        ingredient.setNom("Lime");
        ingredient.setUniteMesure("piece");
        ingredient.setQuantiteStock(new BigDecimal("50"));
        ingredient.setSeuilAlerte(new BigDecimal("10"));

        IngredientResponseDTO dto = IngredientResponseDTO.from(ingredient);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(3L);
        assertThat(dto.nom()).isEqualTo("Lime");
    }

    @Test
    @DisplayName("TableResponseDTO.from - should map TableEntity to TableResponseDTO")
    void tableResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(4L);
        table.setNumero(5);
        table.setCapacite(4);
        table.setZone(TableZone.TERASSE);
        table.setOccupee(false);

        TableResponseDTO dto = TableResponseDTO.from(table);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(4L);
        assertThat(dto.numero()).isEqualTo(5);
    }

    @Test
    @DisplayName("CommandeResponseDTO.from - should map Commande entity to CommandeResponseDTO")
    void commandeResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);

        Commande commande = new Commande();
        commande.setId(10L);
        commande.setTable(table);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setItems(List.of());

        CommandeResponseDTO dto = CommandeResponseDTO.from(commande);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.statut()).isEqualTo(CommandeStatut.EN_ATTENTE);
    }

    @Test
    @DisplayName("FactureResponseDTO.from - should map Facture entity to FactureResponseDTO")
    void factureResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(1L);

        Facture facture = new Facture();
        facture.setId(20L);
        facture.setNumero("FAC-200");
        facture.setTable(table);
        facture.setTotal(new BigDecimal("25.00"));
        facture.setItems(List.of());

        FactureResponseDTO dto = FactureResponseDTO.from(facture);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(20L);
        assertThat(dto.numero()).isEqualTo("FAC-200");
    }

    @Test
    @DisplayName("CocktailVarianteResponseDTO.from - should map CocktailVariante entity")
    void cocktailVarianteResponseDTO_from() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);

        CocktailVariante variante = new CocktailVariante();
        variante.setId(30L);
        variante.setCocktail(cocktail);
        variante.setNom("XL");
        variante.setPrixSupplement(new BigDecimal("2.00"));

        CocktailVarianteResponseDTO dto = CocktailVarianteResponseDTO.from(variante);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(30L);
        assertThat(dto.nom()).isEqualTo("XL");
    }

    @Test
    @DisplayName("CocktailIngredientResponseDTO.from - should map CocktailIngredient entity")
    void cocktailIngredientResponseDTO_from() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);
        Ingredient ingredient = new Ingredient();
        ingredient.setId(2L);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setId(40L);
        ci.setCocktail(cocktail);
        ci.setIngredient(ingredient);
        ci.setQuantite(new BigDecimal("4.00"));

        CocktailIngredientResponseDTO dto = CocktailIngredientResponseDTO.from(ci);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(40L);
        assertThat(dto.quantite()).isEqualByComparingTo(new BigDecimal("4.00"));
    }
}
