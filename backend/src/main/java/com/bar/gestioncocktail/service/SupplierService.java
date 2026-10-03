package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SupplierCreateRequest;
import com.bar.gestioncocktail.dto.SupplierDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.Supplier;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service managing beverage and inventory suppliers, contact details, payment terms,
 * and automatic data migration from legacy free-text supplier names.
 */
@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final EstablishmentConfigService establishmentConfigService;

    /**
     * Constructs the SupplierService with required dependencies.
     *
     * @param supplierRepository         repository for suppliers
     * @param ingredientRepository       repository for ingredients
     * @param establishmentConfigService configuration service for module checks
     */
    @Autowired
    public SupplierService(
            SupplierRepository supplierRepository,
            IngredientRepository ingredientRepository,
            EstablishmentConfigService establishmentConfigService
    ) {
        this.supplierRepository = supplierRepository;
        this.ingredientRepository = ingredientRepository;
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Retrieves all suppliers ordered alphabetically by company name.
     *
     * @return list of all supplier DTOs
     */
    @Transactional(readOnly = true)
    public List<SupplierDTO> getAllSuppliers() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        return supplierRepository.findAllByOrderByNomAsc().stream()
                .map(SupplierDTO::from)
                .toList();
    }

    /**
     * Retrieves all active suppliers ordered by company name.
     *
     * @return list of active supplier DTOs
     */
    @Transactional(readOnly = true)
    public List<SupplierDTO> getActiveSuppliers() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        return supplierRepository.findByActifTrueOrderByNomAsc().stream()
                .map(SupplierDTO::from)
                .toList();
    }

    /**
     * Searches suppliers by name, contact, or email keyword.
     *
     * @param query search query
     * @return list of matching supplier DTOs
     */
    @Transactional(readOnly = true)
    public List<SupplierDTO> searchSuppliers(String query) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        if (query == null || query.isBlank()) {
            return supplierRepository.findByActifTrueOrderByNomAsc().stream()
                    .map(SupplierDTO::from)
                    .toList();
        }
        return supplierRepository.findByNomContainingIgnoreCaseOrContactNomContainingIgnoreCaseOrderByNomAsc(query.trim(), query.trim())
                .stream()
                .map(SupplierDTO::from)
                .toList();
    }

    /**
     * Retrieves a supplier by its unique identifier.
     *
     * @param id supplier identifier
     * @return supplier DTO
     * @throws ResourceNotFoundException if supplier is not found
     */
    @Transactional(readOnly = true)
    public SupplierDTO getSupplierById(Long id) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        return SupplierDTO.from(findSupplierEntity(id));
    }

    /**
     * Internal lookup for a supplier entity.
     *
     * @param id supplier identifier
     * @return supplier entity
     * @throws ResourceNotFoundException if supplier is not found
     */
    public Supplier findSupplierEntity(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + id));
    }

    /**
     * Creates a new supplier record.
     *
     * @param request creation payload
     * @return created supplier DTO
     */
    @Transactional
    public SupplierDTO createSupplier(SupplierCreateRequest request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        if (request == null || request.nom() == null || request.nom().isBlank()) {
            throw new BusinessException("Supplier company name cannot be blank");
        }

        Supplier supplier = new Supplier();
        supplier.setNom(request.nom().trim());
        supplier.setContactNom(request.contactNom());
        supplier.setEmail(request.email());
        supplier.setTelephone(request.telephone());
        supplier.setAdresse(request.adresse());
        supplier.setConditionsPaiement(request.conditionsPaiement());
        supplier.setNotes(request.notes());
        supplier.setActif(request.actif() == null || request.actif());

        Supplier saved = supplierRepository.save(supplier);
        return SupplierDTO.from(saved);
    }

    /**
     * Updates an existing supplier record.
     *
     * @param id      supplier identifier
     * @param request update payload
     * @return updated supplier DTO
     */
    @Transactional
    public SupplierDTO updateSupplier(Long id, SupplierCreateRequest request) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        Supplier supplier = findSupplierEntity(id);

        if (request.nom() != null && !request.nom().isBlank()) {
            supplier.setNom(request.nom().trim());
        }
        supplier.setContactNom(request.contactNom());
        supplier.setEmail(request.email());
        supplier.setTelephone(request.telephone());
        supplier.setAdresse(request.adresse());
        supplier.setConditionsPaiement(request.conditionsPaiement());
        supplier.setNotes(request.notes());
        if (request.actif() != null) {
            supplier.setActif(request.actif());
        }

        Supplier updated = supplierRepository.save(supplier);
        return SupplierDTO.from(updated);
    }

    /**
     * Deactivates (soft-deletes) a supplier.
     *
     * @param id supplier identifier
     */
    @Transactional
    public void deleteSupplier(Long id) {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        Supplier supplier = findSupplierEntity(id);
        supplier.setActif(false);
        supplierRepository.save(supplier);
    }

    /**
     * Migrates legacy free-text supplier names stored on ingredients into formal {@link Supplier} entities.
     * Idempotent: existing supplier records are matched by name.
     */
    @Transactional
    public void migrateLegacyFournisseurNames() {
        List<Ingredient> ingredients = ingredientRepository.findAll();
        for (Ingredient ing : ingredients) {
            if (ing.getDefaultSupplier() == null && ing.getFournisseur() != null && !ing.getFournisseur().isBlank()) {
                String supplierName = ing.getFournisseur().trim();
                Supplier supplier = supplierRepository.findByNomIgnoreCase(supplierName)
                        .orElseGet(() -> {
                            Supplier newSupplier = new Supplier(supplierName);
                            return supplierRepository.save(newSupplier);
                        });
                ing.setDefaultSupplier(supplier);
                ingredientRepository.save(ing);
            }
        }
    }
}
