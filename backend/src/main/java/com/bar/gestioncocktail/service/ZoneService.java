package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.ZoneEntity;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.ZoneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service providing business operations for managing bar zones and their floor levels.
 */
@Service
public class ZoneService {
    private final ZoneRepository zoneRepository;
    private final TableRepository tableRepository;

    public ZoneService(ZoneRepository zoneRepository, TableRepository tableRepository) {
        this.zoneRepository = zoneRepository;
        this.tableRepository = tableRepository;
    }

    public List<ZoneEntity> getAllZones() {
        return zoneRepository.findAll();
    }

    public ZoneEntity getZoneById(Long id) {
        return zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Zone non trouvée avec l'id : " + id));
    }

    @Transactional
    public ZoneEntity createZone(ZoneEntity zone) {
        if (zoneRepository.existsByNom(zone.getNom())) {
            throw new BusinessException("Une zone avec le nom '" + zone.getNom() + "' existe déjà");
        }
        return zoneRepository.save(zone);
    }

    @Transactional
    public ZoneEntity updateZone(Long id, ZoneEntity updated) {
        ZoneEntity existing = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Zone non trouvée avec l'id : " + id));

        String oldNom = existing.getNom();
        String newNom = updated.getNom();

        if (!oldNom.equalsIgnoreCase(newNom) && zoneRepository.existsByNom(newNom)) {
            throw new BusinessException("Une zone avec le nom '" + newNom + "' existe déjà");
        }

        existing.setNom(newNom);
        if (updated.getEtage() != null) {
            existing.setEtage(updated.getEtage());
        }

        ZoneEntity saved = zoneRepository.save(existing);

        // Update all tables assigned to oldNom
        if (!oldNom.equals(newNom)) {
            List<TableEntity> tables = tableRepository.findByZone(oldNom);
            for (TableEntity t : tables) {
                t.setZone(newNom);
                tableRepository.save(t);
            }
        }

        return saved;
    }

    @Transactional
    public void deleteZone(Long id) {
        ZoneEntity zone = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Zone non trouvée avec l'id : " + id));
        zoneRepository.delete(zone);
    }
}
