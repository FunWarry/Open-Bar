package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TableService {

    private static final String TABLE_NOT_FOUND_MSG = "Table not found with id: ";

    private final TableRepository tableRepository;
    private final CommandeRepository commandeRepository;
    private final AuditLogService auditLogService;
    private final TimeService timeService;

    public TableService(TableRepository tableRepository, CommandeRepository commandeRepository, AuditLogService auditLogService, TimeService timeService) {
        this.tableRepository = tableRepository;
        this.commandeRepository = commandeRepository;
        this.auditLogService = auditLogService;
        this.timeService = timeService;
    }

    public List<TableEntity> getAllTables() {
        return tableRepository.findAll();
    }

    public Optional<TableEntity> getTableById(Long id) {
        return tableRepository.findById(id);
    }

    public List<TableEntity> getTablesByZone(String zone) {
        return tableRepository.findByZone(zone);
    }

    public List<String> getAllZones() {
        return tableRepository.findDistinctZones();
    }

    public List<TableEntity> getTablesByOccupee(boolean occupee) {
        return tableRepository.findByOccupee(occupee);
    }

    public List<TableEntity> getTablesByServeurId(Long serveurId) {
        return tableRepository.findByServeurId(serveurId);
    }

    @Transactional
    public TableEntity createTable(TableEntity table) {
        return tableRepository.save(table);
    }

    /**
     * Updates table configuration details (number, capacity, zone, floor plan attributes)
     * while preserving its current operational state (occupation, server, timestamps).
     *
     * @param id           The ID of the table to update
     * @param tableDetails The updated table attributes
     * @return The saved table entity
     */
    @Transactional
    public TableEntity updateTable(Long id, TableEntity tableDetails) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        table.setNumero(tableDetails.getNumero());
        table.setCapacite(tableDetails.getCapacite());
        table.setZone(tableDetails.getZone());

        if (tableDetails.getPlanX() != null) {
            table.setPlanX(tableDetails.getPlanX());
        }
        if (tableDetails.getPlanY() != null) {
            table.setPlanY(tableDetails.getPlanY());
        }
        if (tableDetails.getPlanRotation() != null) {
            table.setPlanRotation(tableDetails.getPlanRotation());
        }
        if (tableDetails.getPlanForme() != null) {
            table.setPlanForme(tableDetails.getPlanForme());
        }
        if (tableDetails.getPlanWidth() != null) {
            table.setPlanWidth(tableDetails.getPlanWidth());
        }
        if (tableDetails.getPlanHeight() != null) {
            table.setPlanHeight(tableDetails.getPlanHeight());
        }

        return tableRepository.save(table);
    }

    @Transactional
    public void deleteTable(Long id) {
        tableRepository.deleteById(id);
    }

    @Transactional
    public TableEntity occuperTable(Long id, Long serveurId) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        if (table.isOccupee()) {
            throw new BusinessException("Table is already occupied");
        }

        table.setOccupee(true);
        table.setServeurId(serveurId);
        table.setDateOccupation(LocalDateTime.now(timeService.getZoneId()));

        return tableRepository.save(table);
    }

    @Transactional
    public TableEntity libererTable(Long id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        if (!table.isOccupee()) {
            throw new BusinessException("Table is not occupied");
        }

        table.setOccupee(false);
        table.setServeurId(null);
        table.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));

        return tableRepository.save(table);
    }

    @Transactional(readOnly = true)
    public List<TableEntity> getAllTablesAvecPositions() {
        return tableRepository.findAll();
    }

    @Transactional
    public TableEntity updatePosition(Long id, Double x, Double y, Double rotation, String forme) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));
        table.setPlanX(x);
        table.setPlanY(y);
        table.setPlanRotation(rotation != null ? rotation : 0.0);
        if (forme != null && (forme.equals("CARRE") || forme.equals("ROND"))) {
            table.setPlanForme(forme);
        }
        return tableRepository.save(table);
    }

    @Transactional
    public void updatePositionsBatch(List<TablePositionDTO> positions) {
        if (positions == null) return;
        positions.stream()
                .filter(dto -> dto != null && dto.id() != null)
                .forEach(this::updateSingleTablePosition);
    }

    private void updateSingleTablePosition(TablePositionDTO dto) {
        tableRepository.findById(dto.id()).ifPresent(table -> {
            if (dto.planX() != null) table.setPlanX(dto.planX());
            if (dto.planY() != null) table.setPlanY(dto.planY());
            table.setPlanRotation(dto.planRotation() != null ? dto.planRotation() : 0.0);
            if (dto.planForme() != null) table.setPlanForme(dto.planForme());
            if (dto.planWidth() != null) table.setPlanWidth(dto.planWidth());
            if (dto.planHeight() != null) table.setPlanHeight(dto.planHeight());
            tableRepository.save(table);
        });
    }

    @Transactional
    public TableEntity transfererCommandes(Long sourceId, Long targetId) {
        TableEntity source = tableRepository.findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + sourceId));
        TableEntity target = tableRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + targetId));

        List<Commande> commandesSource = commandeRepository.findByTable(source);
        List<Commande> commandesActives = commandesSource.stream()
                .filter(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE)
                .toList();

        if (commandesActives.isEmpty()) {
            throw new BusinessException("No active orders to transfer from table " + source.getNumero());
        }

        for (Commande c : commandesActives) {
            c.setTable(target);
            c.setUpdatedAt(timeService.now());
            commandeRepository.save(c);
        }

        target.setOccupee(true);
        if (target.getDateOccupation() == null) {
            target.setDateOccupation(LocalDateTime.now(timeService.getZoneId()));
        }
        tableRepository.save(target);

        boolean sourceEncoreActive = commandeRepository.findByTable(source).stream()
                .anyMatch(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE);

        if (!sourceEncoreActive) {
            source.setOccupee(false);
            source.setServeurId(null);
            source.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));
            tableRepository.save(source);
        }

        auditLogService.logAction(null, "TRANSFERT_TABLE", "TableEntity", sourceId,
                "Transfer orders from table " + source.getNumero() + " to table " + target.getNumero(), null);

        return target;
    }
}