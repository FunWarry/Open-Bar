package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.BarTab;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link CommandeResponseDTO} mapping and table fallback logic.
 */
class CommandeResponseDTOTest {

    @Test
    @DisplayName("from - maps order with direct physical table")
    void from_withDirectTable_mapsTableProperties() {
        TableEntity table = new TableEntity();
        table.setId(15L);
        table.setNumero(4);

        User server = new User();
        server.setId(3L);
        server.setUsername("alice");

        Commande cmd = new Commande();
        cmd.setId(101L);
        cmd.setTable(table);
        cmd.setServeur(server);
        cmd.setStatut(CommandeStatut.EN_ATTENTE);
        cmd.setTotal(new BigDecimal("18.50"));
        cmd.setPourboire(new BigDecimal("2.00"));
        cmd.setPrioritaire(true);
        cmd.setClientRequestId("req-123");
        cmd.setDateCommande(LocalDateTime.now());
        cmd.setItems(new ArrayList<>());

        CommandeResponseDTO dto = CommandeResponseDTO.from(cmd);

        assertThat(dto.id()).isEqualTo(101L);
        assertThat(dto.tableId()).isEqualTo(15L);
        assertThat(dto.tableNumero()).isEqualTo(4);
        assertThat(dto.barTabId()).isNull();
        assertThat(dto.barTabNom()).isNull();
        assertThat(dto.serveurId()).isEqualTo(3L);
        assertThat(dto.serveurUsername()).isEqualTo("alice");
        assertThat(dto.prioritaire()).isTrue();
        assertThat(dto.clientRequestId()).isEqualTo("req-123");
    }

    @Test
    @DisplayName("from - falls back to bar tab tableOriginale when commande table is null")
    void from_withNullTableAndBarTabTableOriginale_fallsBackToOriginalTable() {
        TableEntity originalTable = new TableEntity();
        originalTable.setId(22L);
        originalTable.setNumero(9);

        BarTab tab = new BarTab();
        tab.setId(5L);
        tab.setNom("Ardoise VIP");
        tab.setTableOriginale(originalTable);

        Commande cmd = new Commande();
        cmd.setId(102L);
        cmd.setTable(null);
        cmd.setBarTab(tab);
        cmd.setStatut(CommandeStatut.EN_PREPARATION);
        cmd.setTotal(new BigDecimal("35.00"));
        cmd.setItems(new ArrayList<>());

        CommandeResponseDTO dto = CommandeResponseDTO.from(cmd);

        assertThat(dto.id()).isEqualTo(102L);
        assertThat(dto.tableId()).isEqualTo(22L);
        assertThat(dto.tableNumero()).isEqualTo(9);
        assertThat(dto.barTabId()).isEqualTo(5L);
        assertThat(dto.barTabNom()).isEqualTo("Ardoise VIP");
    }

    @Test
    @DisplayName("from - order with bar tab without original table (counter tab)")
    void from_withBarTabWithoutOriginalTable_tableFieldsAreNull() {
        BarTab tab = new BarTab();
        tab.setId(8L);
        tab.setNom("Comptoir Bar");
        tab.setTableOriginale(null);

        Commande cmd = new Commande();
        cmd.setId(103L);
        cmd.setTable(null);
        cmd.setBarTab(tab);
        cmd.setStatut(CommandeStatut.PRET);
        cmd.setTotal(new BigDecimal("12.00"));
        cmd.setItems(new ArrayList<>());

        CommandeResponseDTO dto = CommandeResponseDTO.from(cmd);

        assertThat(dto.id()).isEqualTo(103L);
        assertThat(dto.tableId()).isNull();
        assertThat(dto.tableNumero()).isNull();
        assertThat(dto.barTabId()).isEqualTo(8L);
        assertThat(dto.barTabNom()).isEqualTo("Comptoir Bar");
    }

    @Test
    @DisplayName("constructor - backward compatible constructor sets null barTabId and barTabNom")
    void legacyConstructor_setsNullBarTabFields() {
        CommandeResponseDTO dto = new CommandeResponseDTO(
                1L, 2L, 5, 3L, "server", List.of(),
                CommandeStatut.EN_ATTENTE, "notes", BigDecimal.TEN, BigDecimal.ONE,
                false, "req-1", null, null, null, null, null, null, null
        );

        assertThat(dto.barTabId()).isNull();
        assertThat(dto.barTabNom()).isNull();
        assertThat(dto.tableId()).isEqualTo(2L);
        assertThat(dto.tableNumero()).isEqualTo(5);
    }
}
