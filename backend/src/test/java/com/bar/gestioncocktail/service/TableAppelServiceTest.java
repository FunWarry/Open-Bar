package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TableAppelRequestDTO;
import com.bar.gestioncocktail.dto.TableAppelResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableAppel;
import com.bar.gestioncocktail.model.TableAppelStatut;
import com.bar.gestioncocktail.model.TableAppelType;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableAppelRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TableAppelService covering call creation, rate-limiting,
 * acknowledgement, active query, and multiple dismiss workflows.
 */
@ExtendWith(MockitoExtension.class)
class TableAppelServiceTest {

    @Mock
    private TableAppelRepository tableAppelRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private AuditLogService auditLogService;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private TableAppelService tableAppelService;

    private TableEntity table;
    private TableAppel appelAssistance;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(4);
        table.setZone("TERRASSE");
        table.setOccupee(true);

        appelAssistance = new TableAppel();
        appelAssistance.setId(10L);
        appelAssistance.setTable(table);
        appelAssistance.setType(TableAppelType.ASSISTANCE);
        appelAssistance.setStatut(TableAppelStatut.EN_ATTENTE);
        appelAssistance.setCreatedAt(LocalDateTime.now().minusSeconds(10));
    }

    @Test
    @DisplayName("Should create waiter assistance call successfully when no recent call exists")
    void creerAppel_nominal_success() {
        TableAppelRequestDTO request = new TableAppelRequestDTO(TableAppelType.ASSISTANCE, "Water please");

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableAppelRepository.existsByTableIdAndTypeAndStatut(1L, TableAppelType.ASSISTANCE, TableAppelStatut.EN_ATTENTE))
                .thenReturn(false);
        when(tableAppelRepository.findRecentAppelsForTable(eq(1L), any(LocalDateTime.class)))
                .thenReturn(List.of());
        when(tableAppelRepository.save(any(TableAppel.class))).thenAnswer(invocation -> {
            TableAppel saved = invocation.getArgument(0);
            saved.setId(100L);
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        TableAppelResponseDTO result = tableAppelService.creerAppel(1L, request);

        assertNotNull(result);
        assertEquals(100L, result.id());
        assertEquals(1L, result.tableId());
        assertEquals(4, result.tableNumero());
        assertEquals(TableAppelType.ASSISTANCE, result.type());
        assertEquals(TableAppelStatut.EN_ATTENTE, result.statut());
        assertEquals("Water please", result.commentaire());

        verify(notificationService, times(1)).notifierNouvelAppel(any(TableAppelResponseDTO.class));
    }

    @Test
    @DisplayName("Should throw BusinessException when rate limit cooldown has not expired")
    void creerAppel_rateLimit_throwsException() {
        TableAppelRequestDTO request = new TableAppelRequestDTO(TableAppelType.ASSISTANCE, null);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableAppelRepository.existsByTableIdAndTypeAndStatut(1L, TableAppelType.ASSISTANCE, TableAppelStatut.EN_ATTENTE))
                .thenReturn(false);
        when(tableAppelRepository.findRecentAppelsForTable(eq(1L), any(LocalDateTime.class)))
                .thenReturn(List.of(appelAssistance));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tableAppelService.creerAppel(1L, request));

        assertTrue(ex.getMessage().contains("Please wait before requesting assistance"));
        verify(tableAppelRepository, never()).save(any(TableAppel.class));
        verify(notificationService, never()).notifierNouvelAppel(any(TableAppelResponseDTO.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when table does not exist")
    void creerAppel_tableNotFound_throwsException() {
        TableAppelRequestDTO request = new TableAppelRequestDTO(TableAppelType.ASSISTANCE, null);

        when(tableRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> tableAppelService.creerAppel(99L, request));
    }

    @Test
    @DisplayName("Should retrieve active calls list across all tables")
    void getActiveAppels_success() {
        when(tableAppelRepository.findByStatutOrderByCreatedAtDesc(TableAppelStatut.EN_ATTENTE))
                .thenReturn(List.of(appelAssistance));

        List<TableAppelResponseDTO> results = tableAppelService.getActiveAppels();

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(10L, results.get(0).id());
    }

    @Test
    @DisplayName("Should retrieve active calls for a specific table")
    void getActiveAppelsPourTable_success() {
        when(tableAppelRepository.findByTableIdAndStatut(1L, TableAppelStatut.EN_ATTENTE))
                .thenReturn(List.of(appelAssistance));

        List<TableAppelResponseDTO> results = tableAppelService.getActiveAppelsPourTable(1L);

        assertEquals(1, results.size());
        assertEquals(TableAppelType.ASSISTANCE, results.get(0).type());
    }

    @Test
    @DisplayName("Should acknowledge a single active call successfully")
    void acquitterAppel_success() {
        when(tableAppelRepository.findById(10L)).thenReturn(Optional.of(appelAssistance));
        when(tableAppelRepository.save(any(TableAppel.class))).thenAnswer(inv -> inv.getArgument(0));

        TableAppelResponseDTO result = tableAppelService.acquitterAppel(1L, 10L, "Jean");

        assertNotNull(result);
        assertEquals(TableAppelStatut.ACQUITTE, result.statut());
        assertEquals("Jean", result.acquittePar());
        assertNotNull(result.acquitteAt());
        verify(notificationService, times(1)).notifierAppelAcquitte(any(TableAppelResponseDTO.class));
    }

    @Test
    @DisplayName("Should throw BusinessException when acknowledging a call from wrong table")
    void acquitterAppel_wrongTable_throwsException() {
        when(tableAppelRepository.findById(10L)).thenReturn(Optional.of(appelAssistance));

        assertThrows(BusinessException.class,
                () -> tableAppelService.acquitterAppel(99L, 10L, "Jean"));
    }

    @Test
    @DisplayName("Should acknowledge all active calls for a specific table")
    void acquitterTousAppelsTable_success() {
        TableAppel appel2 = new TableAppel();
        appel2.setId(11L);
        appel2.setTable(table);
        appel2.setType(TableAppelType.ADDITION);
        appel2.setStatut(TableAppelStatut.EN_ATTENTE);

        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableAppelRepository.findByTableAndStatut(table, TableAppelStatut.EN_ATTENTE)).thenReturn(List.of(appelAssistance, appel2));
        when(tableAppelRepository.save(any(TableAppel.class))).thenAnswer(inv -> inv.getArgument(0));

        List<TableAppelResponseDTO> results = tableAppelService.acquitterTousAppelsTable(1L, "Jean");

        assertEquals(2, results.size());
        assertTrue(results.stream().allMatch(r -> r.statut() == TableAppelStatut.ACQUITTE));
        verify(notificationService, times(2)).notifierAppelAcquitte(any(TableAppelResponseDTO.class));
    }

    @Test
    @DisplayName("Should return existing call when identical alert is already pending")
    void creerAppel_alreadyPending_returnsExisting() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(tableAppelRepository.existsByTableIdAndTypeAndStatut(1L, TableAppelType.ASSISTANCE, TableAppelStatut.EN_ATTENTE))
                .thenReturn(true);
        when(tableAppelRepository.findTopByTableIdAndStatutOrderByCreatedAtDesc(1L, TableAppelStatut.EN_ATTENTE))
                .thenReturn(Optional.of(appelAssistance));

        TableAppelResponseDTO result = tableAppelService.creerAppel(1L, new TableAppelRequestDTO(TableAppelType.ASSISTANCE, null));

        assertNotNull(result);
        assertEquals(10L, result.id());
        verify(tableAppelRepository, never()).save(any(TableAppel.class));
    }

    @Test
    @DisplayName("Should return directly when alert is already acknowledged")
    void acquitterAppel_alreadyAcquitte_returnsDirectly() {
        appelAssistance.setStatut(TableAppelStatut.ACQUITTE);
        when(tableAppelRepository.findById(10L)).thenReturn(Optional.of(appelAssistance));

        TableAppelResponseDTO result = tableAppelService.acquitterAppel(1L, 10L, "Jean");

        assertNotNull(result);
        assertEquals(TableAppelStatut.ACQUITTE, result.statut());
        verify(tableAppelRepository, never()).save(any(TableAppel.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when acknowledging non-existent alert")
    void acquitterAppel_notFound_throwsException() {
        when(tableAppelRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> tableAppelService.acquitterAppel(1L, 999L, "Staff"));
    }

    @Test
    @DisplayName("Should default to Staff when staffUsername is null or blank")
    void acquitterAppel_defaultStaffUsername() {
        when(tableAppelRepository.findById(10L)).thenReturn(Optional.of(appelAssistance));
        when(tableAppelRepository.save(any(TableAppel.class))).thenAnswer(inv -> inv.getArgument(0));

        TableAppelResponseDTO result = tableAppelService.acquitterAppel(1L, 10L, "   ");

        assertNotNull(result);
        assertEquals("Staff", result.acquittePar());
    }
}
