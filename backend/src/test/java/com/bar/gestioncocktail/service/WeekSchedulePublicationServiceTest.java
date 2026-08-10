package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.WeekSchedulePublicationDTO;
import com.bar.gestioncocktail.model.WeekSchedulePublication;
import com.bar.gestioncocktail.repository.WeekSchedulePublicationRepository;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import org.mockito.Mockito;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeekSchedulePublicationServiceTest {

    @Mock
    private WeekSchedulePublicationRepository repository;

    @Mock
    private EmployeeShiftRepository shiftRepository;

    @Mock
    private EstablishmentClosureService closureService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private WeekSchedulePublicationService service;

    private LocalDate monday;

    @BeforeEach
    void setUp() {
        monday = LocalDate.of(2026, 8, 17);
        Mockito.lenient().when(closureService.isClosedOnDate(Mockito.any(LocalDate.class))).thenReturn(false);
    }

    @Test
    @DisplayName("publishWeek() creates a new publication, saves it and broadcasts on /topic/schedule/published")
    void publishWeek_createsAndBroadcasts() throws Exception {
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 8, 17, 12, 0));
        when(repository.findByWeekStart(monday)).thenReturn(Optional.empty());
        when(shiftRepository.findByDateShiftBetween(eq(monday), any(LocalDate.class))).thenReturn(List.of());

        WeekSchedulePublication saved = new WeekSchedulePublication();
        saved.setId(1L);
        saved.setWeekStart(monday);
        saved.setPublishedAt(LocalDateTime.of(2026, 8, 17, 12, 0));
        saved.setPublishedBy("manager1");
        saved.setSnapshotJson("[]");

        when(repository.save(any(WeekSchedulePublication.class))).thenReturn(saved);

        WeekSchedulePublicationDTO result = service.publishWeek(monday, "manager1");

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.weekStart()).isEqualTo(monday);
        assertThat(result.publishedBy()).isEqualTo("manager1");
        assertThat(result.snapshotJson()).isEqualTo("[]");

        verify(repository).save(any(WeekSchedulePublication.class));
        verify(messagingTemplate).convertAndSend("/topic/schedule/published", result);
    }

    @Test
    @DisplayName("publishWeek() updates an existing publication for that week")
    void publishWeek_updatesExisting() throws Exception {
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, 8, 17, 14, 0));
        when(shiftRepository.findByDateShiftBetween(eq(monday), any(LocalDate.class))).thenReturn(List.of());

        WeekSchedulePublication existing = new WeekSchedulePublication();
        existing.setId(2L);
        existing.setWeekStart(monday);
        existing.setPublishedAt(LocalDateTime.of(2026, 8, 10, 10, 0));
        existing.setPublishedBy("oldManager");
        existing.setSnapshotJson("[]");

        when(repository.findByWeekStart(monday)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        WeekSchedulePublicationDTO result = service.publishWeek(monday, "newManager");

        assertThat(result.publishedBy()).isEqualTo("newManager");
        verify(repository).save(existing);
        verify(messagingTemplate).convertAndSend("/topic/schedule/published", result);
    }

    @Test
    @DisplayName("getPublication() returns the DTO when publication exists")
    void getPublication_returnsDtoWhenPresent() {
        WeekSchedulePublication existing = new WeekSchedulePublication();
        existing.setId(1L);
        existing.setWeekStart(monday);
        existing.setPublishedAt(LocalDateTime.now());
        existing.setPublishedBy("admin");

        when(repository.findByWeekStart(monday)).thenReturn(Optional.of(existing));

        Optional<WeekSchedulePublicationDTO> result = service.getPublication(monday);

        assertThat(result).isPresent();
        assertThat(result.get().weekStart()).isEqualTo(monday);
        assertThat(result.get().publishedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("getPublication() returns empty when not published")
    void getPublication_returnsEmptyWhenNotPresent() {
        when(repository.findByWeekStart(monday)).thenReturn(Optional.empty());

        Optional<WeekSchedulePublicationDTO> result = service.getPublication(monday);

        assertThat(result).isEmpty();
    }
}
