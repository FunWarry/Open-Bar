package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class EntityToDtoMappersTest {

    @Test
    @DisplayName("UserResponseDTO.from - maps User entity completely")
    void userResponseDTO_from() {
        User user = new User();
        user.setId(10L);
        user.setUsername("john");
        user.setEmail("john@bar.com");
        user.setNom("Doe");
        user.setPrenom("John");
        user.setRoles(Set.of(UserRole.ADMIN, UserRole.BARMAN));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        UserResponseDTO dto = UserResponseDTO.from(user);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.username()).isEqualTo("john");
        assertThat(dto.roles()).contains(UserRole.ADMIN, UserRole.BARMAN);
    }

    @Test
    @DisplayName("CocktailResponseDTO.from - maps Cocktail entity with variants and ingredients")
    void cocktailResponseDTO_from() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);
        cocktail.setNom("Mojito");
        cocktail.setDescription("Frais");
        cocktail.setPrix(new BigDecimal("9.50"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail.setDisponible(true);

        CocktailResponseDTO dto = CocktailResponseDTO.from(cocktail);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.nom()).isEqualTo("Mojito");
        assertThat(dto.prix()).isEqualByComparingTo(new BigDecimal("9.50"));
    }

    @Test
    @DisplayName("IngredientResponseDTO.from - maps Ingredient entity")
    void ingredientResponseDTO_from() {
        Ingredient ing = new Ingredient();
        ing.setId(2L);
        ing.setNom("Rhum");
        ing.setQuantiteStock(new BigDecimal("10.00"));
        ing.setUniteMesure("L");
        ing.setSeuilAlerte(new BigDecimal("2.00"));

        IngredientResponseDTO dto = IngredientResponseDTO.from(ing);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(2L);
        assertThat(dto.nom()).isEqualTo("Rhum");
        assertThat(dto.quantiteStock()).isEqualByComparingTo(new BigDecimal("10.00"));
    }

    @Test
    @DisplayName("TableResponseDTO.from - maps TableEntity")
    void tableResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(3L);
        table.setNumero(15);
        table.setCapacite(4);
        table.setZone("TERASSE");
        table.setOccupee(true);

        TableResponseDTO dto = TableResponseDTO.from(table);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(3L);
        assertThat(dto.numero()).isEqualTo(15);
        assertThat(dto.occupee()).isTrue();
    }

    @Test
    @DisplayName("CommandeResponseDTO.from - maps Commande entity")
    void commandeResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(3L);
        table.setNumero(15);

        Commande commande = new Commande();
        commande.setId(100L);
        commande.setTable(table);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setTotal(new BigDecimal("25.00"));
        commande.setNotes("No ice cubes");
        commande.setPourboire(new BigDecimal("2.00"));
        commande.setTrackingToken("TOKEN-999");
        commande.setItems(List.of());

        CommandeResponseDTO dto = CommandeResponseDTO.from(commande);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(100L);
        assertThat(dto.tableId()).isEqualTo(3L);
        assertThat(dto.tableNumero()).isEqualTo(15);
        assertThat(dto.statut()).isEqualTo(CommandeStatut.EN_ATTENTE);
        assertThat(dto.notes()).isEqualTo("No ice cubes");
    }

    @Test
    @DisplayName("FactureResponseDTO.from - maps Facture entity")
    void factureResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(4L);
        table.setNumero(8);

        Facture facture = new Facture();
        facture.setId(200L);
        facture.setNumero("FAC-2026-001");
        facture.setTable(table);
        facture.setTotal(new BigDecimal("45.00"));
        facture.setReglee(true);
        facture.setModePaiement("CARTE");
        facture.setDateReglement(LocalDateTime.now());
        facture.setItems(List.of());

        FactureResponseDTO dto = FactureResponseDTO.from(facture);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(200L);
        assertThat(dto.numero()).isEqualTo("FAC-2026-001");
        assertThat(dto.tableNumero()).isEqualTo(8);
        assertThat(dto.reglee()).isTrue();
    }
}
