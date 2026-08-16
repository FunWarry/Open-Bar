package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.RecipeStepTemplateRequestDTO;
import com.bar.gestioncocktail.dto.RecipeStepTemplateResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import com.bar.gestioncocktail.repository.RecipeStepTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service managing reusable mixology action step templates.
 */
@Service
@Transactional
public class RecipeStepTemplateService {

    private static final String NOT_FOUND_MSG = "Recipe step template not found with id: ";

    private final RecipeStepTemplateRepository templateRepository;
    private final TimeService timeService;

    /**
     * Constructs the service with required dependencies.
     *
     * @param templateRepository Repository for recipe step templates
     * @param timeService Time service for timestamp generation
     */
    public RecipeStepTemplateService(RecipeStepTemplateRepository templateRepository, TimeService timeService) {
        this.templateRepository = templateRepository;
        this.timeService = timeService;
    }

    /**
     * Retrieves all recipe step templates ordered by name.
     *
     * @return List of all templates as response DTOs
     */
    @Transactional(readOnly = true)
    public List<RecipeStepTemplateResponseDTO> getAllTemplates() {
        return templateRepository.findAllByOrderByNameAsc()
            .stream()
            .map(RecipeStepTemplateResponseDTO::from)
            .toList();
    }

    /**
     * Retrieves templates filtered by action category.
     *
     * @param actionType Action type category
     * @return List of matching templates
     */
    @Transactional(readOnly = true)
    public List<RecipeStepTemplateResponseDTO> getTemplatesByActionType(RecipeStepActionType actionType) {
        return templateRepository.findByActionType(actionType)
            .stream()
            .map(RecipeStepTemplateResponseDTO::from)
            .toList();
    }

    /**
     * Retrieves a template by its identifier.
     *
     * @param id Template ID
     * @return Found template response DTO
     * @throws ResourceNotFoundException if template not found
     */
    @Transactional(readOnly = true)
    public RecipeStepTemplateResponseDTO getTemplateById(Long id) {
        RecipeStepTemplate template = templateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));
        return RecipeStepTemplateResponseDTO.from(template);
    }

    /**
     * Creates and persists a new reusable action template.
     *
     * @param dto Creation request DTO
     * @return Created template response DTO
     */
    public RecipeStepTemplateResponseDTO createTemplate(RecipeStepTemplateRequestDTO dto) {
        RecipeStepTemplate template = dto.toEntity();
        template.setCreatedAt(timeService.now());
        template.setUpdatedAt(timeService.now());
        RecipeStepTemplate saved = templateRepository.save(template);
        return RecipeStepTemplateResponseDTO.from(saved);
    }

    /**
     * Updates an existing template.
     *
     * @param id Template ID to update
     * @param dto Update request DTO
     * @return Updated template response DTO
     */
    public RecipeStepTemplateResponseDTO updateTemplate(Long id, RecipeStepTemplateRequestDTO dto) {
        RecipeStepTemplate template = templateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));

        template.setName(dto.name());
        template.setActionType(dto.actionType());
        template.setDefaultDurationSeconds(dto.defaultDurationSeconds() != null ? dto.defaultDurationSeconds() : 0);
        template.setIcon(dto.icon());
        template.setDescription(dto.description());
        template.setUpdatedAt(timeService.now());

        RecipeStepTemplate saved = templateRepository.save(template);
        return RecipeStepTemplateResponseDTO.from(saved);
    }

    /**
     * Deletes a template by its ID.
     *
     * @param id Template ID to delete
     * @throws BusinessException if attempting to delete a predefined template
     */
    public void deleteTemplate(Long id) {
        RecipeStepTemplate template = templateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MSG + id));

        if (template.isPredefined()) {
            throw new BusinessException("Cannot delete a predefined standard mixology template.");
        }

        templateRepository.delete(template);
    }
}
