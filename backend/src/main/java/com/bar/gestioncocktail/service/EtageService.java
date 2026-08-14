package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EtageEntity;
import com.bar.gestioncocktail.repository.EtageRepository;
import com.bar.gestioncocktail.repository.ZoneRepository;
import com.bar.gestioncocktail.model.ZoneEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service managing floor (étages) categorization and CRUD operations for
 * OpenBar.
 */
@Service
public class EtageService {

    private static final String ERROR_ETAGE_NOT_FOUND = "Étage non trouvé avec l'id : ";

    private final EtageRepository etageRepository;
    private final ZoneRepository zoneRepository;

    /**
     * Constructor injection for repositories.
     *
     * @param etageRepository repository for floor entities
     * @param zoneRepository  repository for zone entities
     */
    public EtageService(EtageRepository etageRepository, ZoneRepository zoneRepository) {
        this.etageRepository = etageRepository;
        this.zoneRepository = zoneRepository;
    }

    /**
     * Retrieves all floors ordered by display order.
     *
     * @return list of floor entities
     */
    @Transactional(readOnly = true)
    public List<EtageEntity> getAllEtages() {
        return etageRepository.findAllByOrderByOrdreAsc();
    }

    /**
     * Retrieves a floor by its ID.
     *
     * @param id the floor ID
     * @return floor entity
     * @throws ResourceNotFoundException if no floor is found with the ID
     */
    @Transactional(readOnly = true)
    public EtageEntity getEtageById(Long id) {
        if (id == null) {
            throw new ResourceNotFoundException(ERROR_ETAGE_NOT_FOUND + null);
        }
        return etageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ERROR_ETAGE_NOT_FOUND + id));
    }

    /**
     * Creates a new floor entity.
     *
     * @param code  floor code identifier
     * @param nom   floor label
     * @param ordre display order
     * @return saved floor entity
     * @throws BusinessException if code already exists
     */
    @Transactional
    public EtageEntity createEtage(String code, String nom, Integer ordre) {
        String normalizedCode = code.trim().toUpperCase();
        if (etageRepository.existsByCode(normalizedCode)) {
            throw new BusinessException("Un étage avec le code '" + normalizedCode + "' existe déjà.");
        }

        EtageEntity etage = new EtageEntity();
        etage.setCode(normalizedCode);
        etage.setNom(nom.trim());
        etage.setOrdre(ordre != null ? ordre : 0);
        return etageRepository.save(etage);
    }

    /**
     * Updates an existing floor entity.
     *
     * @param id    the floor ID
     * @param code  new floor code identifier
     * @param nom   new floor label
     * @param ordre new display order
     * @return updated floor entity
     * @throws ResourceNotFoundException if floor ID is not found
     * @throws BusinessException         if new code collides with another floor
     */
    @Transactional
    public EtageEntity updateEtage(Long id, String code, String nom, Integer ordre) {
        if (id == null) {
            throw new BusinessException("L'ID d'étage ne peut pas être null");
        }
        EtageEntity existing = etageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ERROR_ETAGE_NOT_FOUND + id));

        String oldCode = existing.getCode();
        String newCode = code.trim().toUpperCase();

        if (!oldCode.equalsIgnoreCase(newCode)) {
            if (etageRepository.existsByCode(newCode)) {
                throw new BusinessException("Un étage avec le code '" + newCode + "' existe déjà.");
            }
            List<ZoneEntity> associatedZones = zoneRepository.findByEtage(oldCode);
            for (ZoneEntity zone : associatedZones) {
                zone.setEtage(newCode);
                zoneRepository.save(zone);
            }
        }

        existing.setCode(newCode);
        existing.setNom(nom.trim());
        if (ordre != null) {
            existing.setOrdre(ordre);
        }

        return etageRepository.save(existing);
    }

    /**
     * Deletes a floor entity if no zones are associated with it.
     *
     * @param id the floor ID
     * @throws ResourceNotFoundException if floor ID is not found
     * @throws BusinessException         if one or more zones are using this floor
     *                                   code
     */
    @Transactional
    public void deleteEtage(Long id) {
        if (id == null) {
            throw new BusinessException("L'ID d'étage ne peut pas être null");
        }
        EtageEntity etage = etageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ERROR_ETAGE_NOT_FOUND + id));

        if (zoneRepository.existsByEtage(etage.getCode())) {
            throw new BusinessException(
                    "Impossible de supprimer cet étage car une ou plusieurs zones y sont associées.");
        }

        etageRepository.delete(etage);
    }

}
