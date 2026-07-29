package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class TableServiceTest {

    @Mock
    TableRepository tableRepository;
    @Mock
    CommandeRepository commandeRepository;
    @Mock
    AuditLogService auditLogService;
    @Spy
    TimeService timeService = new TimeService(null);

    @InjectMocks
    TableService tableService;


    private TableEntity table;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);
        table.setCapacite(4);
        table.setZone(TableZone.INTERIEUR);
        table.setOccupee(false);
    }

    @Test
    void getAllTables_retourneListe() {
        TableEntity table2 = new TableEntity();
        table2.setId(2L);
        table2.setNumero(6);

        when(tableRepository.findAll()).thenReturn(List.of(table, table2));

        List<TableEntity> result = tableService.getAllTables();

        assertThat(result).hasSize(2);
        verify(tableRepository, times(1)).findAll();
    }

    @Test
    void createTable_sauvegarde() {
        TableEntity nouvelle = new TableEntity();
        nouvelle.setNumero(10);
        nouvelle.setCapacite(6);
        nouvelle.setZone(TableZone.TERASSE);

        when(tableRepository.save(any(TableEntity.class))).thenReturn(nouvelle);

        TableEntity result = tableService.createTable(nouvelle);

        assertThat(result.getNumero()).isEqualTo(10);
        verify(tableRepository, times(1)).save(nouvelle);
    }

    @Test
    void occuperTable_setOccupeeEtServeur() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any(TableEntity.class))).thenReturn(table);

        TableEntity result = tableService.occuperTable(1L, 42L);

        assertThat(result.isOccupee()).isTrue();
        assertThat(result.getServeurId()).isEqualTo(42L);
        assertThat(result.getDateOccupation()).isNotNull();
    }

    @Test
    void occuperTable_dejaOccupee_throwException() {
        table.setOccupee(true);
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));

        assertThatThrownBy(() -> tableService.occuperTable(1L, 42L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already occupied");
    }

    @Test
    void libererTable_resetOccupationEtServeur() {
        table.setOccupee(true);
        table.setServeurId(42L);
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any(TableEntity.class))).thenReturn(table);

        TableEntity result = tableService.libererTable(1L);

        assertThat(result.isOccupee()).isFalse();
        assertThat(result.getServeurId()).isNull();
        assertThat(result.getDateLiberation()).isNotNull();
    }

    @Test
    void transfererCommandes_deplaceCommandesEtMetAJourStatutTables() {
        TableEntity source = new TableEntity();
        source.setId(1L);
        source.setNumero(1);
        source.setOccupee(true);

        TableEntity target = new TableEntity();
        target.setId(2L);
        target.setNumero(2);
        target.setOccupee(false);

        Commande commandeActive = new Commande();
        commandeActive.setId(10L);
        commandeActive.setTable(source);
        commandeActive.setStatut(CommandeStatut.EN_PREPARATION);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(source));
        when(tableRepository.findById(2L)).thenReturn(Optional.of(target));
        when(commandeRepository.findByTable(source)).thenReturn(List.of(commandeActive)).thenReturn(List.of());
        when(tableRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TableEntity res = tableService.transfererCommandes(1L, 2L);

        assertThat(res.isOccupee()).isTrue();
        assertThat(source.isOccupee()).isFalse();
        verify(commandeRepository).save(commandeActive);
        assertThat(commandeActive.getTable()).isEqualTo(target);
        verify(auditLogService).logAction(eq(null), eq("TRANSFERT_TABLE"), eq("TableEntity"), eq(1L), anyString(), eq(null));
    }
}
