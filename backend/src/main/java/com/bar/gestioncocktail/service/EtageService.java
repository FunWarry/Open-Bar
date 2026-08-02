package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EtageEntity;
import com.bar.gestioncocktail.repository.EtageRepository;
import com.bar.gestioncocktail.repository.ZoneRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service managing floor (étages) categorization and CRUD operations for OpenBar.
 */
@Service
public class EtageService {

    private final EtageRepository etageRepository;
    private final ZoneRepository zoneRepository;

    /**
     * Constructor injection for repositories.
     *
     * @param etageRepository repository for floor entities
     * @param zoneRepository repository for zone entities
     */
    public EtageService(EtageRepository etageRepository, ZoneRepository zoneRepository) {
        this.etageRepository = etageRepository;
        this.zoneRepository = zoneRepository;
    }

    /**
     * Seeding initial floor entries if the database table is empty.
     */
    @PostConstruct
    @Transactional
    public void initDefaultEtages() {
        if (etageRepository.count() == 0) {
            createInitialEtage("RDC", "Rez-de-chaussée (RDC)", 1);
            createInitialEtage("ETAGE_1", "1er Étage", 2);
            createInitialEtage("ETAGE_2", "2ème Étage", 3);
            createInitialEtage("TERRASSE", "Terrasse / Extérieur", 4);
            createInitialEtage("SOUS_SOL", "Sous-sol / Cave", 5);
        }
    }

    private void createInitialEtage(String code, String nom, int ordre) {
        EtageEntity entity = new EtageEntity();
        entity.setCode(code);
        entity.setNom(nom);
        entity.setOrdre(ordre);
        etageRepository.save(entity);
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
        return etageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Étage non trouvé avec l'id : " + id));
    }

    /**
     * Creates a new floor entity.
     *
     * @param code floor code identifier
     * @param nom floor label
     * @param ordre display order
     * @return saved floor entity
     * @throws BusinessException if code already exists
     */
    @Transactional
    public EtageEntity createEtage(String code, String nom, Integer ordre) {
        if (etageRepository.existsByCode(code)) {
            throw new BusinessException("Un étage avec le code '" + code + "' existe déjà.");
        }

        EtageEntity etage = new EtageEntity();
        etage.setCode(code.trim().toUpperCase());
        etage.setNom(nom.trim());
        etage.setOrdre(ordre != null ? ordre : 0);
        return etageRepository.save(etage);
    }

    /**
     * Updates an existing floor entity.
     *
     * @param id the floor ID
     * @param code new floor code identifier
     * @param nom new floor label
     * @param ordre new display order
     * @return updated floor entity
     * @throws ResourceNotFoundException if floor ID is not found
     * @throws BusinessException if new code collides with another floor
     */
    @Transactional
    public EtageEntity updateEtage(Long id, String code, String nom, Integer ordre) {
        EtageEntity existing = getEtageById(id);

        String newCode = code.trim().toUpperCase();
        if (!existing.getCode().equalsIgnoreCase(newCode) && etageRepository.existsByCode(newCode)) {
            throw new BusinessException("Un étage avec le code '" + newCode + "' existe déjà.");
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
     * @throws BusinessException if one or more zones are using this floor code
     */
    @Transactional
    public void deleteEtage(Long id) {
        EtageEntity etage = getEtageById(id);

        if (zoneRepository.existsByEtage(etage.getCode())) {
            throw new BusinessException("Impossible de supprimer cet étage car une ou plusieurs zones y sont associées.");
        }

        etageRepository.delete(etage);
    }
}
