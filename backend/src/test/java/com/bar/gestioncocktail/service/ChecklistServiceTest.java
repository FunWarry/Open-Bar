package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ChecklistService}.
 * Validates operational template definition, shift run lifecycle, 1-click execution,
 * mandatory compliance validation, and audit tracking.
 */
@ExtendWith(MockitoExtension.class)
class ChecklistServiceTest {

    @Mock
    private ChecklistTemplateRepository checklistTemplateRepository;

    @Mock
    private ChecklistTemplateItemRepository checklistTemplateItemRepository;

    @Mock
    private ChecklistRunRepository checklistRunRepository;

    @Mock
    private ChecklistRunItemRepository checklistRunItemRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TimeService timeService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ChecklistService checklistService;

    private User testUser;
    private ChecklistTemplate testTemplate;
    private ChecklistTemplateItem templateItemMandatory;
    private ChecklistTemplateItem templateItemOptional;
    private ChecklistRun testRun;
    private ChecklistRunItem runItemMandatory;
    private ChecklistRunItem runItemOptional;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(10L);
        testUser.setUsername("alice");
        testUser.setNom("Alice Smith");

        templateItemMandatory = new ChecklistTemplateItem();
        templateItemMandatory.setId(101L);
        templateItemMandatory.setTitle("Check Ice Machine");
        templateItemMandatory.setIsMandatory(true);
        templateItemMandatory.setOrderIndex(1);
        templateItemMandatory.setTargetRole(UserRole.BARMAN);
        templateItemMandatory.setMediaType(ChecklistMediaType.NONE);

        templateItemOptional = new ChecklistTemplateItem();
        templateItemOptional.setId(102L);
        templateItemOptional.setTitle("Polish Bar Surface");
        templateItemOptional.setIsMandatory(false);
        templateItemOptional.setOrderIndex(2);
        templateItemOptional.setTargetRole(UserRole.BARMAN);
        templateItemOptional.setMediaType(ChecklistMediaType.NONE);

        testTemplate = new ChecklistTemplate();
        testTemplate.setId(1L);
        testTemplate.setTitle("Bar Opening Routine");
        testTemplate.setDescription("Morning bar setup checklist");
        testTemplate.setCategory(ChecklistCategory.OPENING);
        testTemplate.setEstimatedDurationMinutes(20);
        testTemplate.setIcon("sunny-outline");
        testTemplate.setColor("#f0a33b");
        testTemplate.setIsActive(true);
        testTemplate.setItems(new ArrayList<>(List.of(templateItemMandatory, templateItemOptional)));

        runItemMandatory = new ChecklistRunItem();
        runItemMandatory.setId(201L);
        runItemMandatory.setTemplateItemId(101L);
        runItemMandatory.setTitle("Check Ice Machine");
        runItemMandatory.setIsMandatory(true);
        runItemMandatory.setIsCompleted(false);

        runItemOptional = new ChecklistRunItem();
        runItemOptional.setId(202L);
        runItemOptional.setTemplateItemId(102L);
        runItemOptional.setTitle("Polish Bar Surface");
        runItemOptional.setIsMandatory(false);
        runItemOptional.setIsCompleted(false);

        testRun = new ChecklistRun();
        testRun.setId(50L);
        testRun.setTemplateId(1L);
        testRun.setTemplateTitle("Bar Opening Routine");
        testRun.setCategory(ChecklistCategory.OPENING);
        testRun.setStatus(ChecklistRunStatus.IN_PROGRESS);
        testRun.setStartedAt(LocalDateTime.of(2026, 10, 9, 8, 0));
        testRun.setCreatedBy(testUser);
        testRun.setItems(new ArrayList<>(List.of(runItemMandatory, runItemOptional)));
        runItemMandatory.setRun(testRun);
        runItemOptional.setRun(testRun);
    }

    @Test
    @DisplayName("Should return all active templates when requested")
    void shouldReturnAllActiveTemplates() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.findByIsActiveOrderByCategoryAscTitleAsc(true))
                .thenReturn(List.of(testTemplate));

        List<ChecklistTemplateDTO> results = checklistService.getAllTemplates(true);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).title()).isEqualTo("Bar Opening Routine");
    }

    @Test
    @DisplayName("Should throw BusinessException when module is disabled")
    void shouldThrowWhenModuleIsDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(false);

        assertThatThrownBy(() -> checklistService.getAllTemplates(true))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Checklists and SOP procedures module is disabled");
    }

    @Test
    @DisplayName("Should get template by ID successfully")
    void shouldGetTemplateById() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.findById(1L)).thenReturn(Optional.of(testTemplate));

        ChecklistTemplateDTO dto = checklistService.getTemplateById(1L);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.items()).hasSize(2);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when template does not exist")
    void shouldThrowWhenTemplateNotFound() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> checklistService.getTemplateById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Should create template and broadcast event")
    void shouldCreateTemplateAndBroadcast() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.save(any(ChecklistTemplate.class))).thenAnswer(inv -> {
            ChecklistTemplate saved = inv.getArgument(0);
            saved.setId(5L);
            return saved;
        });

        CreateChecklistTemplateRequest req = new CreateChecklistTemplateRequest(
                "Closing Bar Routine",
                "Evening closing SOP",
                ChecklistCategory.CLOSING,
                30,
                "moon-outline",
                "#9b8af2",
                List.of(new CreateChecklistTemplateItemRequest(
                        "Lock safe",
                        "Store daily cash",
                        true,
                        1,
                        UserRole.MANAGER,
                        ChecklistMediaType.NONE,
                        null,
                        null
                ))
        );

        ChecklistTemplateDTO result = checklistService.createTemplate(req);

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.title()).isEqualTo("Closing Bar Routine");
        verify(messagingTemplate).convertAndSend(eq("/topic/checklists"), any(ChecklistEventDTO.class));
    }

    @Test
    @DisplayName("Should start checklist run and copy template items into run items")
    void shouldStartRunFromTemplate() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.findById(1L)).thenReturn(Optional.of(testTemplate));
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 10, 9, 8, 30));
        when(checklistRunRepository.save(any(ChecklistRun.class))).thenAnswer(inv -> {
            ChecklistRun r = inv.getArgument(0);
            r.setId(77L);
            return r;
        });

        StartChecklistRunRequest req = new StartChecklistRunRequest(1L, "Morning shift start");
        ChecklistRunDTO runDTO = checklistService.startRun(req, "alice");

        assertThat(runDTO.id()).isEqualTo(77L);
        assertThat(runDTO.status()).isEqualTo(ChecklistRunStatus.IN_PROGRESS);
        assertThat(runDTO.totalItemsCount()).isEqualTo(2);
        assertThat(runDTO.completedItemsCount()).isZero();
    }

    @Test
    @DisplayName("Should toggle run item completion with actor attribution and photo proof")
    void shouldToggleRunItem() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findById(50L)).thenReturn(Optional.of(testRun));
        when(checklistRunItemRepository.findById(201L)).thenReturn(Optional.of(runItemMandatory));
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 10, 9, 8, 45));
        when(checklistRunRepository.save(any(ChecklistRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ToggleChecklistRunItemRequest toggleReq = new ToggleChecklistRunItemRequest(
                true,
                "Machine cleaned and restocked",
                "/uploads/checklists/ice_proof.jpg"
        );

        ChecklistRunDTO updated = checklistService.toggleRunItem(50L, 201L, toggleReq, "alice");

        assertThat(runItemMandatory.getIsCompleted()).isTrue();
        assertThat(runItemMandatory.getCompletedBy()).isEqualTo(testUser);
        assertThat(runItemMandatory.getPhotoProofUrl()).isEqualTo("/uploads/checklists/ice_proof.jpg");
        assertThat(updated.completionPercentage()).isEqualTo(50);
        assertThat(updated.completedItemsCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should prevent modifying items on a completed run")
    void shouldPreventModifyingCompletedRun() {
        testRun.setStatus(ChecklistRunStatus.COMPLETED);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findById(50L)).thenReturn(Optional.of(testRun));

        ToggleChecklistRunItemRequest toggleReq = new ToggleChecklistRunItemRequest(true, null, null);

        assertThatThrownBy(() -> checklistService.toggleRunItem(50L, 201L, toggleReq, "alice"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot modify items on a COMPLETED checklist run");
    }

    @Test
    @DisplayName("Should complete run when all mandatory tasks are fulfilled")
    void shouldCompleteRunWhenMandatoryTasksFulfilled() {
        runItemMandatory.setIsCompleted(true);
        runItemMandatory.setCompletedBy(testUser);

        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findById(50L)).thenReturn(Optional.of(testRun));
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(testUser));
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 10, 9, 9, 0));
        when(checklistRunRepository.save(any(ChecklistRun.class))).thenAnswer(inv -> inv.getArgument(0));

        CompleteChecklistRunRequest req = new CompleteChecklistRunRequest("All opening checks completed successfully");
        ChecklistRunDTO completed = checklistService.completeRun(50L, req, "alice");

        assertThat(completed.status()).isEqualTo(ChecklistRunStatus.COMPLETED);
        assertThat(completed.completedByFullName()).isEqualTo("Alice Smith");
        verify(messagingTemplate).convertAndSend(eq("/topic/checklists"), any(ChecklistEventDTO.class));
    }

    @Test
    @DisplayName("Should reject completion when mandatory items are still pending")
    void shouldRejectCompletionWhenMandatoryItemsPending() {
        runItemMandatory.setIsCompleted(false);

        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findById(50L)).thenReturn(Optional.of(testRun));

        CompleteChecklistRunRequest req = new CompleteChecklistRunRequest(null);

        assertThatThrownBy(() -> checklistService.completeRun(50L, req, "alice"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot complete checklist: mandatory tasks are still pending");
    }

    @Test
    @DisplayName("Should cancel active run successfully")
    void shouldCancelActiveRun() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findById(50L)).thenReturn(Optional.of(testRun));
        when(checklistRunRepository.save(any(ChecklistRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ChecklistRunDTO cancelled = checklistService.cancelRun(50L, "alice");

        assertThat(cancelled.status()).isEqualTo(ChecklistRunStatus.CANCELLED);
    }

    @Test
    @DisplayName("Should compute correct stats across active and completed runs")
    void shouldComputeCorrectStats() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.countByStatus(ChecklistRunStatus.IN_PROGRESS)).thenReturn(2L);
        when(checklistTemplateRepository.findByIsActiveOrderByCategoryAscTitleAsc(true)).thenReturn(List.of(testTemplate));
        when(timeService.today()).thenReturn(LocalDate.of(2026, 10, 9));
        when(checklistRunRepository.findByStartedAtBetweenOrderByStartedAtDesc(any(), any())).thenReturn(List.of(testRun));

        ChecklistStatsDTO stats = checklistService.getStats();

        assertThat(stats.activeRunsCount()).isEqualTo(2);
        assertThat(stats.activeTemplatesCount()).isEqualTo(1);
        assertThat(stats.averageCompletionPercentageToday()).isZero();
    }

    @Test
    @DisplayName("Should throw BusinessException when checklists module is disabled")
    void shouldThrowExceptionWhenModuleDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(false);

        assertThatThrownBy(() -> checklistService.getActiveRuns())
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Checklists and SOP procedures module is disabled");
    }

    @Test
    @DisplayName("Should update existing checklist template")
    void shouldUpdateTemplate() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.findById(1L)).thenReturn(Optional.of(testTemplate));
        when(checklistTemplateRepository.save(any(ChecklistTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateChecklistTemplateRequest updateReq = new UpdateChecklistTemplateRequest(
                "Updated Title",
                "Updated Description",
                ChecklistCategory.CLOSING,
                30,
                "moon-outline",
                "#ff0000",
                true,
                List.of(new CreateChecklistTemplateItemRequest(
                        "New Step", "Desc", true, 0, UserRole.BARMAN,
                        List.of("BARMAN"), List.of(1L), List.of("alice"),
                        ChecklistMediaType.NONE, null, null, null, null
                ))
        );

        ChecklistTemplateDTO updated = checklistService.updateTemplate(1L, updateReq);

        assertThat(updated.title()).isEqualTo("Updated Title");
        assertThat(updated.category()).isEqualTo(ChecklistCategory.CLOSING);
        verify(checklistTemplateRepository).save(testTemplate);
        verify(messagingTemplate).convertAndSend(eq("/topic/checklists"), any(ChecklistEventDTO.class));
    }

    @Test
    @DisplayName("Should soft-delete / deactivate template")
    void shouldDeleteTemplate() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistTemplateRepository.findById(1L)).thenReturn(Optional.of(testTemplate));
        when(checklistTemplateRepository.save(any(ChecklistTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        checklistService.deleteTemplate(1L);

        assertThat(testTemplate.getIsActive()).isFalse();
        verify(checklistTemplateRepository).save(testTemplate);
        verify(messagingTemplate).convertAndSend(eq("/topic/checklists"), any(ChecklistEventDTO.class));
    }

    @Test
    @DisplayName("Should get run by ID or throw ResourceNotFoundException")
    void shouldGetRunById() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findById(50L)).thenReturn(Optional.of(testRun));
        when(checklistRunRepository.findById(999L)).thenReturn(Optional.empty());

        ChecklistRunDTO found = checklistService.getRunById(50L);
        assertThat(found.id()).isEqualTo(50L);

        assertThatThrownBy(() -> checklistService.getRunById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Should list runs history filtered by status and category")
    void shouldListRunsFiltered() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CHECKLISTS_PROCEDURES)).thenReturn(true);
        when(checklistRunRepository.findByStatusOrderByStartedAtDesc(ChecklistRunStatus.IN_PROGRESS))
                .thenReturn(List.of(testRun));

        List<ChecklistRunDTO> runs = checklistService.getRunsHistory(null, ChecklistCategory.OPENING, ChecklistRunStatus.IN_PROGRESS);
        assertThat(runs).hasSize(1);

        List<ChecklistRunDTO> active = checklistService.getActiveRuns();
        assertThat(active).hasSize(1);
    }
}
