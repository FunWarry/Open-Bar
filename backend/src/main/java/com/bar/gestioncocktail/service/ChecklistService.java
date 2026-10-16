package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.ChecklistRunItemRepository;
import com.bar.gestioncocktail.repository.ChecklistRunRepository;
import com.bar.gestioncocktail.repository.ChecklistTemplateRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service managing operational checklist templates, SOP procedures, shift execution runs,
 * task completion tracking, staff attribution, and real-time WebSocket synchronization.
 */
@Service
public class ChecklistService {

    private static final Logger log = LoggerFactory.getLogger(ChecklistService.class);
    private static final String WS_TOPIC = "/topic/checklists";
    private static final String TEMPLATE_NOT_FOUND_MSG = "Checklist template not found with ID: ";
    private static final String RUN_NOT_FOUND_MSG = "Checklist run not found with ID: ";

    private final ChecklistTemplateRepository checklistTemplateRepository;
    private final ChecklistRunRepository checklistRunRepository;
    private final ChecklistRunItemRepository checklistRunItemRepository;
    private final UserRepository userRepository;
    private final EstablishmentConfigService establishmentConfigService;
    private final SimpMessagingTemplate messagingTemplate;
    private final TimeService timeService;

    /**
     * Constructs ChecklistService with all required repositories and infrastructure services.
     *
     * @param checklistTemplateRepository Repository for checklist templates
     * @param checklistRunRepository      Repository for checklist execution runs
     * @param checklistRunItemRepository  Repository for run items
     * @param userRepository              Repository for user accounts
     * @param establishmentConfigService  Service managing modular capabilities
     * @param messagingTemplate           STOMP WebSocket messaging template
     * @param timeService                 Service providing accurate localized timestamps
     */
    public ChecklistService(
            ChecklistTemplateRepository checklistTemplateRepository,
            ChecklistRunRepository checklistRunRepository,
            ChecklistRunItemRepository checklistRunItemRepository,
            UserRepository userRepository,
            EstablishmentConfigService establishmentConfigService,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService) {
        this.checklistTemplateRepository = checklistTemplateRepository;
        this.checklistRunRepository = checklistRunRepository;
        this.checklistRunItemRepository = checklistRunItemRepository;
        this.userRepository = userRepository;
        this.establishmentConfigService = establishmentConfigService;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
    }

    /**
     * Asserts that the CHECKLISTS_PROCEDURES establishment module is enabled.
     */
    public void verifyModuleEnabled() {
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)) {
            throw new BusinessException("Checklists and SOP procedures module is disabled for this establishment");
        }
    }

    /**
     * Retrieves all checklist templates, optionally restricted to active ones.
     *
     * @param activeOnly Whether to retrieve only active templates
     * @return List of matching templates as DTOs
     */
    @Transactional(readOnly = true)
    public List<ChecklistTemplateDTO> getAllTemplates(Boolean activeOnly) {
        verifyModuleEnabled();
        List<ChecklistTemplate> templates = Boolean.TRUE.equals(activeOnly)
                ? checklistTemplateRepository.findByIsActiveOrderByCategoryAscTitleAsc(true)
                : checklistTemplateRepository.findAll();
        return templates.stream().map(ChecklistTemplateDTO::from).toList();
    }

    /**
     * Retrieves a checklist template by its ID.
     *
     * @param id Template ID
     * @return Template DTO
     */
    @Transactional(readOnly = true)
    public ChecklistTemplateDTO getTemplateById(Long id) {
        verifyModuleEnabled();
        ChecklistTemplate template = checklistTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_MSG + id));
        return ChecklistTemplateDTO.from(template);
    }

    /**
     * Creates a new checklist template with its initial steps.
     *
     * @param request Creation payload
     * @return Created template DTO
     */
    @Transactional
    public ChecklistTemplateDTO createTemplate(CreateChecklistTemplateRequest request) {
        verifyModuleEnabled();
        ChecklistTemplate template = new ChecklistTemplate();
        template.setTitle(request.title().trim());
        template.setDescription(request.description());
        template.setCategory(request.category());
        if (request.estimatedDurationMinutes() != null) {
            template.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        }
        if (request.icon() != null && !request.icon().isBlank()) {
            template.setIcon(request.icon().trim());
        }
        if (request.color() != null && !request.color().isBlank()) {
            template.setColor(request.color().trim());
        }
        template.setIsActive(true);
        populateTemplateItems(template, request.items());

        ChecklistTemplate saved = checklistTemplateRepository.save(template);
        log.info("Created checklist template '{}' with ID {}", saved.getTitle(), saved.getId());
        ChecklistTemplateDTO dto = ChecklistTemplateDTO.from(saved);
        broadcastTemplateEvent("TEMPLATE_CREATED", saved.getId(), dto);
        return dto;
    }

    /**
     * Updates an existing checklist template and its associated tasks.
     *
     * @param id      Template ID
     * @param request Update payload
     * @return Updated template DTO
     */
    @Transactional
    public ChecklistTemplateDTO updateTemplate(Long id, UpdateChecklistTemplateRequest request) {
        verifyModuleEnabled();
        ChecklistTemplate template = checklistTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_MSG + id));

        applyTemplateUpdates(template, request);

        ChecklistTemplate saved = checklistTemplateRepository.save(template);
        log.info("Updated checklist template ID {}", saved.getId());
        ChecklistTemplateDTO dto = ChecklistTemplateDTO.from(saved);
        broadcastTemplateEvent("TEMPLATE_UPDATED", saved.getId(), dto);
        return dto;
    }

    private void applyTemplateUpdates(ChecklistTemplate template, UpdateChecklistTemplateRequest request) {
        if (request.title() != null && !request.title().isBlank()) {
            template.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            template.setDescription(request.description());
        }
        if (request.category() != null) {
            template.setCategory(request.category());
        }
        if (request.estimatedDurationMinutes() != null) {
            template.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        }
        if (request.icon() != null) {
            template.setIcon(request.icon().trim());
        }
        if (request.color() != null) {
            template.setColor(request.color().trim());
        }
        if (request.isActive() != null) {
            template.setIsActive(request.isActive());
        }
        if (request.items() != null) {
            template.getItems().clear();
            populateTemplateItems(template, request.items());
        }
    }

    private void populateTemplateItems(ChecklistTemplate template, List<CreateChecklistTemplateItemRequest> itemRequests) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            return;
        }
        for (int i = 0; i < itemRequests.size(); i++) {
            template.addItem(buildTemplateItem(itemRequests.get(i), i));
        }
    }

    private ChecklistTemplateItem buildTemplateItem(CreateChecklistTemplateItemRequest itemReq, int defaultIndex) {
        ChecklistTemplateItem item = new ChecklistTemplateItem();
        item.setTitle(itemReq.title().trim());
        item.setDescription(itemReq.description());
        item.setIsMandatory(itemReq.isMandatory() == null || itemReq.isMandatory());
        item.setOrderIndex(itemReq.orderIndex() != null ? itemReq.orderIndex() : defaultIndex);
        item.setTargetRole(itemReq.targetRole());
        item.setMediaType(itemReq.mediaType() != null ? itemReq.mediaType() : ChecklistMediaType.NONE);
        item.setMediaUrl(itemReq.mediaUrl());
        item.setVideoEmbedUrl(itemReq.videoEmbedUrl());
        item.setMediaAttachmentsJson(itemReq.mediaAttachmentsJson());
        item.setStepsJson(itemReq.stepsJson());

        assignRolesAndUsers(item, itemReq);
        return item;
    }

    private void assignRolesAndUsers(ChecklistTemplateItem item, CreateChecklistTemplateItemRequest itemReq) {
        if (itemReq.assignedRoles() != null && !itemReq.assignedRoles().isEmpty()) {
            item.setAssignedRoles(String.join(",", itemReq.assignedRoles()));
            resolveTargetRoleIfMissing(item, itemReq.assignedRoles().get(0));
        } else if (itemReq.targetRole() != null) {
            item.setAssignedRoles(itemReq.targetRole().name());
        }

        if (itemReq.assignedUserIds() != null && !itemReq.assignedUserIds().isEmpty()) {
            item.setAssignedUserIds(itemReq.assignedUserIds().stream()
                    .map(String::valueOf)
                    .collect(java.util.stream.Collectors.joining(",")));
        }
        if (itemReq.assignedUsernames() != null && !itemReq.assignedUsernames().isEmpty()) {
            item.setAssignedUsernames(String.join(",", itemReq.assignedUsernames()));
        }
    }

    private void resolveTargetRoleIfMissing(ChecklistTemplateItem item, String firstRole) {
        if (item.getTargetRole() == null) {
            try {
                item.setTargetRole(UserRole.valueOf(firstRole));
            } catch (Exception _) {
                // Non-standard role token
            }
        }
    }

    /**
     * Deactivates or removes a checklist template.
     *
     * @param id Template ID
     */
    @Transactional
    public void deleteTemplate(Long id) {
        verifyModuleEnabled();
        ChecklistTemplate template = checklistTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_MSG + id));

        template.setIsActive(false);
        checklistTemplateRepository.save(template);
        log.info("Deactivated checklist template ID {}", id);
        broadcastTemplateEvent("TEMPLATE_DELETED", id, null);
    }

    /**
     * Starts an interactive checklist execution run from a template.
     *
     * @param request  Run initiation request
     * @param username Username of initiating staff member
     * @return Newly created checklist run DTO
     */
    @Transactional
    public ChecklistRunDTO startRun(StartChecklistRunRequest request, String username) {
        verifyModuleEnabled();
        ChecklistTemplate template = checklistTemplateRepository.findById(request.templateId())
                .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_MSG + request.templateId()));

        // Idempotency: if an execution session for this template is already in progress, return the existing active run
        java.util.Optional<ChecklistRun> existingActive = checklistRunRepository.findFirstByTemplateIdAndStatusOrderByStartedAtDesc(template.getId(), ChecklistRunStatus.IN_PROGRESS);
        if (existingActive.isPresent()) {
            ChecklistRun existing = existingActive.get();
            log.info("Checklist run for template ID {} is already in progress (run ID {}), returning existing active run", template.getId(), existing.getId());
            return ChecklistRunDTO.from(existing);
        }

        User currentUser = resolveUser(username);

        ChecklistRun run = new ChecklistRun();
        run.setTemplateId(template.getId());
        run.setTemplateTitle(template.getTitle());
        run.setCategory(template.getCategory());
        run.setStatus(ChecklistRunStatus.IN_PROGRESS);
        run.setStartedAt(timeService.now());
        run.setCreatedBy(currentUser);
        run.setNotes(request.notes());

        if (template.getItems() != null && !template.getItems().isEmpty()) {
            for (ChecklistTemplateItem templateItem : template.getItems()) {
                ChecklistRunItem runItem = new ChecklistRunItem();
                runItem.setTemplateItemId(templateItem.getId());
                runItem.setTitle(templateItem.getTitle());
                runItem.setDescription(templateItem.getDescription());
                runItem.setIsMandatory(templateItem.getIsMandatory());
                runItem.setOrderIndex(templateItem.getOrderIndex());
                runItem.setTargetRole(templateItem.getTargetRole());
                runItem.setAssignedRoles(templateItem.getAssignedRoles());
                runItem.setAssignedUserIds(templateItem.getAssignedUserIds());
                runItem.setAssignedUsernames(templateItem.getAssignedUsernames());
                runItem.setMediaType(templateItem.getMediaType());
                runItem.setMediaUrl(templateItem.getMediaUrl());
                runItem.setVideoEmbedUrl(templateItem.getVideoEmbedUrl());
                runItem.setMediaAttachmentsJson(templateItem.getMediaAttachmentsJson());
                runItem.setStepsJson(templateItem.getStepsJson());
                runItem.setIsCompleted(false);
                run.addItem(runItem);
            }
        }

        ChecklistRun saved = checklistRunRepository.save(run);
        log.info("Started checklist run ID {} for template '{}'", saved.getId(), saved.getTemplateTitle());
        ChecklistRunDTO dto = ChecklistRunDTO.from(saved);
        broadcastEvent("RUN_STARTED", saved.getId(), null, template.getId(), username, dto);
        return dto;
    }

    /**
     * Retrieves currently active runs with IN_PROGRESS status.
     *
     * @return List of active runs
     */
    @Transactional(readOnly = true)
    public List<ChecklistRunDTO> getActiveRuns() {
        verifyModuleEnabled();
        return checklistRunRepository.findByStatusOrderByStartedAtDesc(ChecklistRunStatus.IN_PROGRESS)
                .stream().map(ChecklistRunDTO::from).toList();
    }

    /**
     * Retrieves execution runs history with optional date and category filters.
     *
     * @param date     Optional target date
     * @param category Optional category filter
     * @param status   Optional status filter
     * @return List of matching runs
     */
    @Transactional(readOnly = true)
    public List<ChecklistRunDTO> getRunsHistory(LocalDate date, ChecklistCategory category, ChecklistRunStatus status) {
        verifyModuleEnabled();
        List<ChecklistRun> runs;
        if (date != null) {
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);
            runs = checklistRunRepository.findByStartedAtBetweenOrderByStartedAtDesc(start, end);
        } else if (status != null) {
            runs = checklistRunRepository.findByStatusOrderByStartedAtDesc(status);
        } else if (category != null) {
            runs = checklistRunRepository.findByCategoryOrderByStartedAtDesc(category);
        } else {
            runs = checklistRunRepository.findAllByOrderByStartedAtDesc();
        }

        return runs.stream()
                .filter(r -> category == null || r.getCategory() == category)
                .filter(r -> status == null || r.getStatus() == status)
                .map(ChecklistRunDTO::from)
                .toList();
    }

    /**
     * Retrieves details of a specific checklist run by ID.
     *
     * @param runId Run identifier
     * @return Checklist run DTO
     */
    @Transactional(readOnly = true)
    public ChecklistRunDTO getRunById(Long runId) {
        verifyModuleEnabled();
        ChecklistRun run = checklistRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException(RUN_NOT_FOUND_MSG + runId));
        return ChecklistRunDTO.from(run);
    }

    /**
     * Marks an individual task within an active checklist run as completed or uncompleted.
     * Captures actor identity, precise timestamp, and optional remarks or compliance photos.
     *
     * @param runId    Identifier of parent checklist run
     * @param itemId   Identifier of task item to toggle
     * @param request  Toggle parameters
     * @param username Username of staff member checking the item
     * @return Updated checklist run DTO
     */
    @Transactional
    public ChecklistRunDTO toggleRunItem(Long runId, Long itemId, ToggleChecklistRunItemRequest request, String username) {
        verifyModuleEnabled();
        ChecklistRun run = checklistRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException(RUN_NOT_FOUND_MSG + runId));

        if (run.getStatus() != ChecklistRunStatus.IN_PROGRESS) {
            throw new BusinessException("Cannot modify items on a " + run.getStatus() + " checklist run");
        }

        ChecklistRunItem item = checklistRunItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist run item not found with ID: " + itemId));

        if (!item.getRun().getId().equals(runId)) {
            throw new BusinessException("Item ID " + itemId + " does not belong to run ID " + runId);
        }

        User currentUser = resolveUser(username);
        boolean desiredState = request.resolveDesiredState(Boolean.TRUE.equals(item.getIsCompleted()));

        if (desiredState) {
            item.setIsCompleted(true);
            item.setCompletedAt(timeService.now());
            item.setCompletedBy(currentUser);
        } else {
            item.setIsCompleted(false);
            item.setCompletedAt(null);
            item.setCompletedBy(null);
        }

        if (request.comment() != null) {
            item.setComment(request.comment().trim());
        }
        if (request.photoProofUrl() != null) {
            item.setPhotoProofUrl(request.photoProofUrl().trim());
        }

        checklistRunItemRepository.save(item);

        if (run.getItems() != null) {
            for (ChecklistRunItem it : run.getItems()) {
                if (it.getId().equals(itemId)) {
                    it.setIsCompleted(item.getIsCompleted());
                    it.setCompletedAt(item.getCompletedAt());
                    it.setCompletedBy(item.getCompletedBy());
                    it.setComment(item.getComment());
                    it.setPhotoProofUrl(item.getPhotoProofUrl());
                    break;
                }
            }
        }

        ChecklistRun saved = checklistRunRepository.save(run);

        log.info("Toggled task ID {} in run ID {} to completed={} by {}", itemId, runId, desiredState, username);
        ChecklistRunDTO dto = ChecklistRunDTO.from(saved);
        broadcastEvent("ITEM_TOGGLED", runId, itemId, run.getTemplateId(), username, dto);
        return dto;
    }

    /**
     * Finalizes and closes an in-progress checklist run.
     *
     * @param runId    Run identifier
     * @param request  Completion payload
     * @param username Username of staff member finalizing the session
     * @return Finalized checklist run DTO
     */
    @Transactional
    public ChecklistRunDTO completeRun(Long runId, CompleteChecklistRunRequest request, String username) {
        verifyModuleEnabled();
        ChecklistRun run = checklistRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException(RUN_NOT_FOUND_MSG + runId));

        if (run.getStatus() == ChecklistRunStatus.COMPLETED) {
            return ChecklistRunDTO.from(run);
        }

        if (run.getStatus() == ChecklistRunStatus.CANCELLED) {
            throw new BusinessException("Cannot complete a cancelled checklist run");
        }

        if (!run.areMandatoryItemsCompleted()) {
            throw new BusinessException("Cannot complete checklist: mandatory tasks are still pending");
        }

        User currentUser = resolveUser(username);
        run.setStatus(ChecklistRunStatus.COMPLETED);
        run.setCompletedAt(timeService.now());
        run.setCompletedBy(currentUser);
        if (request != null && request.notes() != null && !request.notes().isBlank()) {
            run.setNotes(request.notes().trim());
        }

        ChecklistRun saved = checklistRunRepository.save(run);
        log.info("Finalized checklist run ID {} by {}", runId, username);
        ChecklistRunDTO dto = ChecklistRunDTO.from(saved);
        broadcastEvent("RUN_COMPLETED", runId, null, run.getTemplateId(), username, dto);
        return dto;
    }

    /**
     * Cancels an active checklist run.
     *
     * @param runId    Run identifier
     * @param username Username of cancelling staff member
     * @return Cancelled checklist run DTO
     */
    @Transactional
    public ChecklistRunDTO cancelRun(Long runId, String username) {
        verifyModuleEnabled();
        ChecklistRun run = checklistRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException(RUN_NOT_FOUND_MSG + runId));

        run.setStatus(ChecklistRunStatus.CANCELLED);
        run.setCompletedAt(timeService.now());

        ChecklistRun saved = checklistRunRepository.save(run);
        log.info("Cancelled checklist run ID {} by {}", runId, username);
        ChecklistRunDTO dto = ChecklistRunDTO.from(saved);
        broadcastEvent("RUN_CANCELLED", runId, null, run.getTemplateId(), username, dto);
        return dto;
    }

    /**
     * Calculates high-level checklist metrics for management dashboards.
     *
     * @return Summary stats DTO
     */
    @Transactional(readOnly = true)
    public ChecklistStatsDTO getStats() {
        verifyModuleEnabled();
        List<ChecklistRun> activeRuns = checklistRunRepository.findByStatusOrderByStartedAtDesc(ChecklistRunStatus.IN_PROGRESS);
        long activeTemplates = checklistTemplateRepository.findByIsActiveOrderByCategoryAscTitleAsc(true).size();

        LocalDate today = timeService.today();
        Map<Long, ChecklistRun> completedTodayById = findRunsCompletedToday(today.atStartOfDay(), today.atTime(LocalTime.MAX));

        // Include all currently active operational sessions AND all sessions finalized today
        Map<Long, ChecklistRun> evaluatedRunsById = new LinkedHashMap<>();
        if (activeRuns != null) {
            for (ChecklistRun run : activeRuns) {
                if (run != null && run.getId() != null) {
                    evaluatedRunsById.put(run.getId(), run);
                }
            }
        }
        evaluatedRunsById.putAll(completedTodayById);

        int avgPercentage = calculateAverageCompletionPercentage(evaluatedRunsById.values());
        return new ChecklistStatsDTO(activeRuns != null ? activeRuns.size() : 0, completedTodayById.size(), activeTemplates, avgPercentage);
    }

    private Map<Long, ChecklistRun> findRunsCompletedToday(LocalDateTime start, LocalDateTime end) {
        Map<Long, ChecklistRun> completedTodayById = new LinkedHashMap<>();
        collectCompletedRuns(completedTodayById, checklistRunRepository.findByCompletedAtBetweenOrderByCompletedAtDesc(start, end));
        collectCompletedRuns(completedTodayById, checklistRunRepository.findByStartedAtBetweenOrderByStartedAtDesc(start, end));
        return completedTodayById;
    }

    private void collectCompletedRuns(Map<Long, ChecklistRun> targetMap, List<ChecklistRun> runs) {
        if (runs == null) {
            return;
        }
        for (ChecklistRun run : runs) {
            if (run != null && run.getId() != null && run.getStatus() == ChecklistRunStatus.COMPLETED) {
                targetMap.put(run.getId(), run);
            }
        }
    }

    private int calculateAverageCompletionPercentage(Collection<ChecklistRun> runs) {
        if (runs == null || runs.isEmpty()) {
            return 0;
        }
        int sum = 0;
        int count = 0;
        for (ChecklistRun run : runs) {
            if (run != null) {
                sum += run.getCompletionPercentage();
                count++;
            }
        }
        return count > 0 ? (int) Math.round((double) sum / count) : 0;
    }

    private User resolveUser(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }

    private void broadcastEvent(String eventType, Long runId, Long itemId, Long templateId, String username, ChecklistRunDTO run) {
        if (messagingTemplate == null) {
            return;
        }
        try {
            ChecklistEventDTO event = new ChecklistEventDTO(
                    eventType,
                    runId,
                    itemId,
                    templateId,
                    username,
                    timeService.now(),
                    run,
                    null
            );
            messagingTemplate.convertAndSend(WS_TOPIC, event);
        } catch (Exception e) {
            log.warn("Failed to broadcast checklist WebSocket event: {}", e.getMessage());
        }
    }

    private void broadcastTemplateEvent(String eventType, Long templateId, ChecklistTemplateDTO template) {
        if (messagingTemplate == null) {
            return;
        }
        try {
            ChecklistEventDTO event = new ChecklistEventDTO(
                    eventType,
                    null,
                    null,
                    templateId,
                    null,
                    timeService.now(),
                    null,
                    template
            );
            messagingTemplate.convertAndSend(WS_TOPIC, event);
        } catch (Exception e) {
            log.warn("Failed to broadcast template WebSocket event: {}", e.getMessage());
        }
    }
}
