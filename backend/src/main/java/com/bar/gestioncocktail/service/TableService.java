package com.bar.gestioncocktail.service;

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
                .orElseThrow(() -> new RuntimeException("Table non trouvée avec l'id: " + id));

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
                .orElseThrow(() -> new RuntimeException("Table non trouvée avec l'id: " + id));

        if (table.isOccupee()) {
            throw new RuntimeException("La table est déjà occupée");
        }

        table.setOccupee(true);
        table.setServeurId(serveurId);
        table.setDateOccupation(LocalDateTime.now());

        return tableRepository.save(table);
    }

    @Transactional
    public TableEntity libererTable(Long id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Table non trouvée avec l'id: " + id));

        if (!table.isOccupee()) {
            throw new RuntimeException("La table n'est pas occupée");
        }

        table.setOccupee(false);
        table.setServeurId(null);
        table.setDateLiberation(LocalDateTime.now());

        return tableRepository.save(table);
    }
} 