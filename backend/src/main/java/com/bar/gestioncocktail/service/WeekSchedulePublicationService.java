package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.dto.WeekSchedulePublicationDTO;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.WeekSchedulePublication;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import com.bar.gestioncocktail.repository.WeekSchedulePublicationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Service managing week schedule publication.
 * <p>
 * When a manager publishes a weekly planning, this service:
 * <ol>
 *   <li>Upserts the publication record (creates or updates) with a JSON snapshot of shifts.</li>
 *   <li>Broadcasts a STOMP notification on {@code /topic/schedule/published}
 *       so all connected users are immediately notified.</li>
 * </ol>
 */
@Service
@Transactional(readOnly = true)
public class WeekSchedulePublicationService {

    private final WeekSchedulePublicationRepository repository;
    private final EmployeeShiftRepository shiftRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final TimeService timeService;
    private final ObjectMapper objectMapper;

    public WeekSchedulePublicationService(
            WeekSchedulePublicationRepository repository,
            EmployeeShiftRepository shiftRepository,
            SimpMessagingTemplate messagingTemplate,
            TimeService timeService,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.shiftRepository = shiftRepository;
        this.messagingTemplate = messagingTemplate;
        this.timeService = timeService;
        this.objectMapper = objectMapper;
    }

    /**
     * Publishes (or republishes) the week planning starting on {@code weekStart}.
     * <p>
     * If a publication already exists for that week, its {@code publishedAt},
     * {@code publishedBy}, and {@code snapshotJson} fields are updated in place. A STOMP message is always
     * sent to {@code /topic/schedule/published} regardless.
     *
     * @param weekStart ISO date of the Monday starting the week
     * @param username  Login of the manager performing the publication
     * @return The persisted {@link WeekSchedulePublicationDTO}
     */
    @Transactional
    public WeekSchedulePublicationDTO publishWeek(LocalDate weekStart, String username) {
        WeekSchedulePublication pub = repository.findByWeekStart(weekStart)
                .orElseGet(WeekSchedulePublication::new);

        pub.setWeekStart(weekStart);
        pub.setPublishedAt(timeService.now());
        pub.setPublishedBy(username);

        LocalDate sunday = weekStart.plusDays(6);
        List<EmployeeShift> shifts = shiftRepository.findByDateShiftBetween(weekStart, sunday);
        String snapshotJson = "[]";
        try {
            List<EmployeeShiftResponseDTO> dtos = shifts.stream().map(EmployeeShiftResponseDTO::from).toList();
            snapshotJson = objectMapper.writeValueAsString(dtos);
        } catch (Exception e) {
            // fallback gracefully
        }
        pub.setSnapshotJson(snapshotJson);

        WeekSchedulePublication saved = repository.save(pub);
        WeekSchedulePublicationDTO dto = WeekSchedulePublicationDTO.from(saved);

        messagingTemplate.convertAndSend("/topic/schedule/published", dto);

        return dto;
    }

    /**
     * Returns the publication record for the given week, if it exists.
     *
     * @param weekStart ISO date of the Monday starting the week
     * @return Optional publication DTO
     */
    public Optional<WeekSchedulePublicationDTO> getPublication(LocalDate weekStart) {
        return repository.findByWeekStart(weekStart)
                .map(WeekSchedulePublicationDTO::from);
    }
}
