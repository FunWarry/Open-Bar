package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.TableEntity;
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
    com.bar.gestioncocktail.repository.FactureRepository factureRepository;
    @Mock
    AuditLogService auditLogService;
    @Mock
    org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
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
        table.setZone("INTERIEUR");
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
        nouvelle.setZone("TERASSE");

        when(tableRepository.save(any(TableEntity.class))).thenReturn(nouvelle);

        TableEntity result = tableService.createTable(nouvelle);

        assertThat(result.getNumero()).isEqualTo(10);
        verify(tableRepository, times(1)).save(nouvelle);
    }

    @Test
    void updateTable_conserveEtatOccupation() {
        table.setOccupee(true);
        table.setServeurId(99L);
        table.setDateOccupation(java.time.LocalDateTime.now());

        TableEntity modif = new TableEntity();
        modif.setNumero(15);
        modif.setCapacite(8);
        modif.setZone("TERRASSE");
        // modif.isOccupee() is false by default in DTO conversions

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any(TableEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        TableEntity result = tableService.updateTable(1L, modif);

        assertThat(result.getNumero()).isEqualTo(15);
        assertThat(result.getCapacite()).isEqualTo(8);
        assertThat(result.getZone()).isEqualTo("TERRASSE");
        assertThat(result.isOccupee()).isTrue();
        assertThat(result.getServeurId()).isEqualTo(99L);
        assertThat(result.getDateOccupation()).isNotNull();
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

    @Test
    void getTableById_syncsOccupancyAndReturns() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.existsByTableAndStatutIn(eq(table), anyList())).thenReturn(true);
        when(tableRepository.save(any(TableEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<TableEntity> res = tableService.getTableById(1L);

        assertThat(res).isPresent();
        assertThat(res.get().isOccupee()).isTrue();
    }

    @Test
    void getTablesByZone_syncsAndReturns() {
        when(tableRepository.findByZone("INTERIEUR")).thenReturn(List.of(table));

        List<TableEntity> res = tableService.getTablesByZone("INTERIEUR");

        assertThat(res).hasSize(1);
    }

    @Test
    void getAllZones_returnsDistinct() {
        when(tableRepository.findDistinctZones()).thenReturn(List.of("INTERIEUR", "TERRASSE"));

        List<String> res = tableService.getAllZones();

        assertThat(res).containsExactly("INTERIEUR", "TERRASSE");
    }

    @Test
    void getTablesByOccupee_and_ServeurId() {
        when(tableRepository.findAll()).thenReturn(List.of(table));
        when(tableRepository.findByOccupee(false)).thenReturn(List.of(table));
        when(tableRepository.findByServeurId(42L)).thenReturn(List.of(table));

        List<TableEntity> r1 = tableService.getTablesByOccupee(false);
        assertThat(r1).hasSize(1);

        List<TableEntity> r2 = tableService.getTablesByServeurId(42L);
        assertThat(r2).hasSize(1);
    }

    @Test
    void deleteTable_nominal_supprimeEtNotifie() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.existsByTableAndStatutIn(eq(table), anyList())).thenReturn(false);

        tableService.deleteTable(1L);

        verify(commandeRepository).detachTableFromCommandes(1L);
        verify(factureRepository).detachTableFromFactures(1L);
        verify(tableRepository).delete(table);
        verify(auditLogService).logAction(eq(null), eq("DELETE"), eq("TableEntity"), eq(1L), anyString(), eq(null));
    }

    @Test
    void deleteTable_avecCommandesActives_lanceBusinessException() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.existsByTableAndStatutIn(eq(table), anyList())).thenReturn(true);

        assertThatThrownBy(() -> tableService.deleteTable(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot delete table with active orders");

        verify(tableRepository, never()).delete(any());
    }

    @Test
    void deleteTable_tableInexistante_lanceResourceNotFoundException() {
        when(tableRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tableService.deleteTable(999L))
                .isInstanceOf(com.bar.gestioncocktail.exception.ResourceNotFoundException.class);
    }

    @Test
    void updatePosition_metAJourCoordonnees() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TableEntity pos = tableService.updatePosition(1L, 100.0, 200.0, 45.0, "CARRE");
        assertThat(pos.getPlanX()).isEqualTo(100.0);
        assertThat(pos.getPlanY()).isEqualTo(200.0);
        assertThat(pos.getPlanRotation()).isEqualTo(45.0);
        assertThat(pos.getPlanForme()).isEqualTo("CARRE");
    }

    @Test
    void updatePositionsBatch_updatesAllValidDTOs() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));

        com.bar.gestioncocktail.dto.TablePositionDTO dto = new com.bar.gestioncocktail.dto.TablePositionDTO(
                1L, 50.0, 60.0, 90.0, "ROND", 80.0, 80.0
        );

        tableService.updatePositionsBatch(List.of(dto));

        assertThat(table.getPlanX()).isEqualTo(50.0);
        assertThat(table.getPlanY()).isEqualTo(60.0);
        assertThat(table.getPlanRotation()).isEqualTo(90.0);
        assertThat(table.getPlanForme()).isEqualTo("ROND");
        assertThat(table.getPlanWidth()).isEqualTo(80.0);
        assertThat(table.getPlanHeight()).isEqualTo(80.0);

        tableService.updatePositionsBatch(null);
    }

    @Test
    void getAllTablesAvecPositions_returnsAllTables() {
        when(tableRepository.findAll()).thenReturn(List.of(table));

        List<TableEntity> res = tableService.getAllTablesAvecPositions();

        assertThat(res).hasSize(1);
    }

    @Test
    void synchronizeTableOccupancy_setsOccupiedWhenActiveOrdersFound() {
        table.setOccupee(false);
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(commandeRepository.existsByTableAndStatutIn(eq(table), anyList())).thenReturn(true);
        when(tableRepository.save(any(TableEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<TableEntity> res = tableService.getTableById(1L);

        assertThat(res).isPresent();
        assertThat(res.get().isOccupee()).isTrue();
        assertThat(res.get().getDateOccupation()).isNotNull();
    }

    @Test
    void updateTable_updatesAllPlanFields() {
        TableEntity details = new TableEntity();
        details.setNumero(20);
        details.setCapacite(8);
        details.setZone("VIP");
        details.setPlanX(150.0);
        details.setPlanY(250.0);
        details.setPlanRotation(180.0);
        details.setPlanForme("ROND");
        details.setPlanWidth(120.0);
        details.setPlanHeight(120.0);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any(TableEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        TableEntity updated = tableService.updateTable(1L, details);

        assertThat(updated.getPlanWidth()).isEqualTo(120.0);
        assertThat(updated.getPlanHeight()).isEqualTo(120.0);
        assertThat(updated.getPlanRotation()).isEqualTo(180.0);
        assertThat(updated.getPlanForme()).isEqualTo("ROND");
    }
}
