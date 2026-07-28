package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
public class TableService {

    private static final String TABLE_NOT_FOUND_MSG = "Table not found with id: ";

    private final TableRepository tableRepository;
    private final CommandeRepository commandeRepository;
    private final AuditLogService auditLogService;

    @Autowired
    public TableService(TableRepository tableRepository, CommandeRepository commandeRepository, AuditLogService auditLogService) {
        this.tableRepository = tableRepository;
        this.commandeRepository = commandeRepository;
        this.auditLogService = auditLogService;
    }

    public List<TableEntity> getAllTables() {
        return tableRepository.findAll();
    }

    public Optional<TableEntity> getTableById(Long id) {
        return tableRepository.findById(id);
    }

    public List<TableEntity> getTablesByZone(TableZone zone) {
        return tableRepository.findByZone(zone);
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

    @Transactional
    public TableEntity updateTable(Long id, TableEntity tableDetails) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        table.setNumero(tableDetails.getNumero());
        table.setCapacite(tableDetails.getCapacite());
        table.setZone(tableDetails.getZone());
        table.setOccupee(tableDetails.isOccupee());
        table.setServeurId(tableDetails.getServeurId());
        table.setDateOccupation(tableDetails.getDateOccupation());
        table.setDateLiberation(tableDetails.getDateLiberation());

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
        table.setDateOccupation(LocalDateTime.now(ZoneId.systemDefault()));

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
        table.setDateLiberation(LocalDateTime.now(ZoneId.systemDefault()));

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
        for (TablePositionDTO dto : positions) {
            tableRepository.findById(dto.id()).ifPresent(table -> {
                table.setPlanX(dto.planX());
                table.setPlanY(dto.planY());
                table.setPlanRotation(dto.planRotation() != null ? dto.planRotation() : 0.0);
                if (dto.planForme() != null) table.setPlanForme(dto.planForme());
                tableRepository.save(table);
            });
        }
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
            throw new BusinessException("Aucune commande active à transférer sur la table " + source.getNumero());
        }

        for (Commande c : commandesActives) {
            c.setTable(target);
            c.setUpdatedAt(LocalDateTime.now());
            commandeRepository.save(c);
        }

        target.setOccupee(true);
        if (target.getDateOccupation() == null) {
            target.setDateOccupation(LocalDateTime.now(ZoneId.systemDefault()));
        }
        tableRepository.save(target);

        boolean sourceEncoreActive = commandeRepository.findByTable(source).stream()
                .anyMatch(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE);

        if (!sourceEncoreActive) {
            source.setOccupee(false);
            source.setServeurId(null);
            source.setDateLiberation(LocalDateTime.now(ZoneId.systemDefault()));
            tableRepository.save(source);
        }

        auditLogService.logAction(null, "TRANSFERT_TABLE", "TableEntity", sourceId,
                "Transfert des commandes de la table " + source.getNumero() + " vers la table " + target.getNumero(), null);

        return target;
    }
}