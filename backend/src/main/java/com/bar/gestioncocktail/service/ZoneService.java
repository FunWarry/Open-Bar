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
    private static final String ZONE_NOT_FOUND_MSG = "Zone non trouvée avec l'id : ";

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
        if (id == null) {
            throw new ResourceNotFoundException("Zone non trouvée (ID null)");
        }
        return zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ZONE_NOT_FOUND_MSG + id));
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
        if (id == null) {
            throw new BusinessException("L'ID de zone ne peut pas être null");
        }
        ZoneEntity existing = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ZONE_NOT_FOUND_MSG + id));

        String oldNom = existing.getNom();
        String newNom = updated.getNom();

        if (!oldNom.equalsIgnoreCase(newNom) && zoneRepository.existsByNom(newNom)) {
            throw new BusinessException("Une zone avec le nom '" + newNom + "' existe déjà");
        }

        existing.setNom(newNom);
        if (updated.getEtage() != null) {
            existing.setEtage(updated.getEtage());
        }
        if (updated.getPlanX() != null) {
            existing.setPlanX(updated.getPlanX());
        }
        if (updated.getPlanY() != null) {
            existing.setPlanY(updated.getPlanY());
        }
        if (updated.getPlanWidth() != null) {
            existing.setPlanWidth(updated.getPlanWidth());
        }
        if (updated.getPlanHeight() != null) {
            existing.setPlanHeight(updated.getPlanHeight());
        }
        if (updated.getShapeType() != null) {
            existing.setShapeType(updated.getShapeType());
        }
        if (updated.getPointsJson() != null) {
            existing.setPointsJson(updated.getPointsJson());
        }
        if (updated.getCornerRadiiJson() != null) {
            existing.setCornerRadiiJson(updated.getCornerRadiiJson());
        }
        if (updated.getCouleur() != null) {
            existing.setCouleur(updated.getCouleur());
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
        if (id == null) {
            throw new BusinessException("L'ID de zone ne peut pas être null");
        }
        ZoneEntity zone = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ZONE_NOT_FOUND_MSG + id));
        zoneRepository.delete(zone);
    }
}
