package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.GlasswareRequestDTO;
import com.bar.gestioncocktail.dto.GlasswareResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Glassware;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service managing glassware catalog (tumbler, coupe, flute, rocks...)
 * and custom glassware created by users.
 */
@Service
@Transactional(readOnly = true)
public class GlasswareService {

    private static final String NOT_FOUND_MSG = "Glassware not found with id: ";

    private final GlasswareRepository glasswareRepository;
    private final TimeService timeService;
    private final FileUploadService fileUploadService;

    /**
     * Constructor injection.
     *
     * @param glasswareRepository Repository for glassware persistence
     * @param timeService Service providing current datetime
     * @param fileUploadService Service for file storage
     */
    public GlasswareService(GlasswareRepository glasswareRepository, TimeService timeService, FileUploadService fileUploadService) {
        this.glasswareRepository = glasswareRepository;
        this.timeService = timeService;
        this.fileUploadService = fileUploadService;
    }

    /**
     * Retrieves all glassware available in the bar catalog.
     *
     * @return List of glassware response DTOs
     */
    public List<GlasswareResponseDTO> getAll() {
        return glasswareRepository.findAllByOrderByNomAsc()
            .stream()
            .map(GlasswareResponseDTO::from)
            .toList();
    }

    /**
     * Retrieves a single glassware by ID.
     *
     * @param id Glassware ID
     * @return Glassware response DTO
     * @throws ResourceNotFoundException if glassware not found
     */
    public GlasswareResponseDTO getById(Long id) {
        Glassware entity = glasswareRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));
        return GlasswareResponseDTO.from(entity);
    }

    /**
     * Finds entity by ID (internal use for cocktail mapping).
     *
     * @param id Glassware ID
     * @return Glassware entity
     */
    public Glassware findEntityById(Long id) {
        if (id == null) return null;
        return glasswareRepository.findById(id).orElse(null);
    }

    /**
     * Creates and persists a new glassware item.
     *
     * @param request Creation request DTO
     * @return Created glassware response DTO
     * @throws BusinessException if a glassware with identical name already exists
     */
    @Transactional
    public GlasswareResponseDTO create(GlasswareRequestDTO request) {
        if (glasswareRepository.findByNomIgnoreCase(request.nom().trim()).isPresent()) {
            throw new BusinessException("A glassware item with name '" + request.nom().trim() + "' already exists");
        }

        Glassware entity = request.toEntity();
        entity.setCreatedAt(timeService.now());
        entity.setUpdatedAt(timeService.now());

        Glassware saved = glasswareRepository.save(entity);
        return GlasswareResponseDTO.from(saved);
    }

    /**
     * Updates an existing glassware item.
     *
     * @param id Glassware ID to update
     * @param request Update request DTO
     * @return Updated glassware response DTO
     */
    @Transactional
    public GlasswareResponseDTO update(Long id, GlasswareRequestDTO request) {
        Glassware entity = glasswareRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));

        glasswareRepository.findByNomIgnoreCase(request.nom().trim())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new BusinessException("A glassware item with name '" + request.nom().trim() + "' already exists");
            });

        entity.setNom(request.nom().trim());
        entity.setContenanceCl(request.contenanceCl());
        if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
            entity.setImageUrl(request.imageUrl().trim());
        }
        entity.setDescription(request.description());
        entity.setUpdatedAt(timeService.now());

        Glassware saved = glasswareRepository.save(entity);
        return GlasswareResponseDTO.from(saved);
    }

    /**
     * Updates glassware photo by uploading a new image file.
     *
     * @param id   Glassware ID
     * @param file Uploaded image file
     * @return Updated glassware response DTO
     */
    @Transactional
    public GlasswareResponseDTO updateGlasswareImage(Long id, org.springframework.web.multipart.MultipartFile file) {
        Glassware entity = glasswareRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));

        String photoUrl = fileUploadService.storeGlasswarePhoto(id, file);
        entity.setImageUrl(photoUrl);
        entity.setUpdatedAt(timeService.now());

        Glassware saved = glasswareRepository.save(entity);
        return GlasswareResponseDTO.from(saved);
    }

    /**
     * Deletes a glassware item by ID.
     *
     * @param id Glassware ID to delete
     */
    @Transactional
    public void delete(Long id) {
        Glassware entity = glasswareRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));
        glasswareRepository.delete(entity);
    }
}
