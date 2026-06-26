package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.repository.TableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TableService {

    @Autowired
    private TableRepository tableRepository;

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
                .orElseThrow(() -> new ResourceNotFoundException("Table non trouvée avec l'id: " + id));

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
                .orElseThrow(() -> new ResourceNotFoundException("Table non trouvée avec l'id: " + id));

        if (table.isOccupee()) {
            throw new BusinessException("La table est déjà occupée");
        }

        table.setOccupee(true);
        table.setServeurId(serveurId);
        table.setDateOccupation(LocalDateTime.now());

        return tableRepository.save(table);
    }

    @Transactional
    public TableEntity libererTable(Long id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Table non trouvée avec l'id: " + id));

        if (!table.isOccupee()) {
            throw new BusinessException("La table n'est pas occupée");
        }

        table.setOccupee(false);
        table.setServeurId(null);
        table.setDateLiberation(LocalDateTime.now());

        return tableRepository.save(table);
    }

    @Transactional(readOnly = true)
    public List<TableEntity> getAllTablesAvecPositions() {
        return tableRepository.findAll();
    }

    @Transactional
    public TableEntity updatePosition(Long id, Double x, Double y, Double rotation, String forme) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Table non trouvée: " + id));
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
}