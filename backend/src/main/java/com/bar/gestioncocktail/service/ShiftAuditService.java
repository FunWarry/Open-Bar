package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EmployeeShiftResponseDTO;
import com.bar.gestioncocktail.dto.ShiftAuditLogDTO;
import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.ShiftAuditAction;
import com.bar.gestioncocktail.model.ShiftAuditLog;
import com.bar.gestioncocktail.repository.EmployeeShiftRepository;
import com.bar.gestioncocktail.repository.ShiftAuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Service managing immutable audit logs for employee shift modifications and time-travel replay.
 */
@Service
@Transactional(readOnly = true)
public class ShiftAuditService {

    private static final Logger log = LoggerFactory.getLogger(ShiftAuditService.class);
    private static final String DEFAULT_SYSTEM_AUTHOR = "SYSTEM";
    private static final String SHIFT_NULL_MSG = "shift must not be null";

    private final ShiftAuditLogRepository auditLogRepository;
    private final EmployeeShiftRepository shiftRepository;
    private final TimeService timeService;
    private final ObjectMapper objectMapper;

    /**
     * Constructs the shift audit service with required dependencies.
     *
     * @param auditLogRepository Repository for persisting and querying shift audit logs
     * @param shiftRepository Repository for shift entity queries
     * @param timeService Service providing current establishment time
     */
    public ShiftAuditService(
            ShiftAuditLogRepository auditLogRepository,
            EmployeeShiftRepository shiftRepository,
            TimeService timeService) {
        this.auditLogRepository = auditLogRepository;
        this.shiftRepository = shiftRepository;
        this.timeService = timeService;
        this.objectMapper = new ObjectMapper()
                .findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Serializes an {@link EmployeeShiftResponseDTO} to a JSON string.
     *
     * @param dto Shift response DTO
     * @return JSON string or null on failure
     */
    public String toJson(EmployeeShiftResponseDTO dto) {
        if (dto == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(dto);
        } catch (Exception e) {
            log.error("Failed to serialize shift snapshot to JSON", e);
            return null;
        }
    }

    /**
     * Deserializes a JSON string into an {@link EmployeeShiftResponseDTO}.
     *
     * @param json JSON string
     * @return Shift response DTO or null on failure
     */
    public EmployeeShiftResponseDTO fromJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, EmployeeShiftResponseDTO.class);
        } catch (Exception e) {
            log.error("Failed to deserialize shift snapshot from JSON: {}", json, e);
            return null;
        }
    }

    private String resolveAuthor(String username) {
        return (username != null && !username.isBlank()) ? username : DEFAULT_SYSTEM_AUTHOR;
    }

    /**
     * Records an audit log entry for a newly created shift.
     *
     * @param shift Newly created shift entity
     * @param username Username of the author
     * @return Persisted audit log entry
     */
    @Transactional
    public ShiftAuditLog logCreation(EmployeeShift shift, String username) {
        Objects.requireNonNull(shift, SHIFT_NULL_MSG);
        EmployeeShiftResponseDTO dto = EmployeeShiftResponseDTO.from(shift);
        String newSnapshot = toJson(dto);
        String author = resolveAuthor(username);

        ShiftAuditLog auditLog = ShiftAuditLog.builder()
                .shiftId(shift.getId())
                .user(shift.getUser())
                .dateShift(shift.getDateShift())
                .action(ShiftAuditAction.CREATED)
                .changedBy(author)
                .changedAt(timeService.now())
                .previousSnapshot(null)
                .newSnapshot(newSnapshot)
                .build();

        return auditLogRepository.save(auditLog);
    }

    /**
     * Records an audit log entry for an updated shift.
     *
     * @param shift Updated shift entity
     * @param previousSnapshot JSON string before update
     * @param newSnapshot JSON string after update
     * @param username Username of the author
     * @return Persisted audit log entry
     */
    @Transactional
    public ShiftAuditLog logUpdate(EmployeeShift shift, String previousSnapshot, String newSnapshot, String username) {
        Objects.requireNonNull(shift, SHIFT_NULL_MSG);
        String author = resolveAuthor(username);

        ShiftAuditLog auditLog = ShiftAuditLog.builder()
                .shiftId(shift.getId())
                .user(shift.getUser())
                .dateShift(shift.getDateShift())
                .action(ShiftAuditAction.UPDATED)
                .changedBy(author)
                .changedAt(timeService.now())
                .previousSnapshot(previousSnapshot)
                .newSnapshot(newSnapshot)
                .build();

        return auditLogRepository.save(auditLog);
    }

    /**
     * Records an audit log entry for a deleted shift.
     *
     * @param shift Shift entity being deleted
     * @param previousSnapshot JSON string before deletion
     * @param username Username of the author
     * @return Persisted audit log entry
     */
    @Transactional
    public ShiftAuditLog logDeletion(EmployeeShift shift, String previousSnapshot, String username) {
        Objects.requireNonNull(shift, SHIFT_NULL_MSG);
        String author = resolveAuthor(username);

        ShiftAuditLog auditLog = ShiftAuditLog.builder()
                .shiftId(shift.getId())
                .user(shift.getUser())
                .dateShift(shift.getDateShift())
                .action(ShiftAuditAction.DELETED)
                .changedBy(author)
                .changedAt(timeService.now())
                .previousSnapshot(previousSnapshot)
                .newSnapshot(null)
                .build();

        return auditLogRepository.save(auditLog);
    }

    /**
     * Retrieves the complete modification history for a single work shift.
     *
     * @param shiftId Shift identifier
     * @return List of audit log DTOs ordered descending by timestamp
     */
    public List<ShiftAuditLogDTO> getHistoryForShift(Long shiftId) {
        return auditLogRepository.findByShiftIdOrderByChangedAtDesc(shiftId).stream()
                .map(ShiftAuditLogDTO::from)
                .toList();
    }

    /**
     * Retrieves the audit log of all shift modifications for a given week.
     *
     * @param week Date within the target week
     * @param userId Optional user identifier to filter by
     * @return List of audit log DTOs ordered descending by timestamp
     */
    public List<ShiftAuditLogDTO> getAuditLogForWeek(LocalDate week, Long userId) {
        LocalDate monday = week != null ? week.with(DayOfWeek.MONDAY) : timeService.today().with(DayOfWeek.MONDAY);
        LocalDate sunday = monday.plusDays(6);

        List<ShiftAuditLog> logs;
        if (userId != null) {
            logs = auditLogRepository.findByDateShiftBetweenAndUserIdOrderByChangedAtDesc(monday, sunday, userId);
        } else {
            logs = auditLogRepository.findByDateShiftBetweenOrderByChangedAtDesc(monday, sunday);
        }

        return logs.stream()
                .map(ShiftAuditLogDTO::from)
                .toList();
    }

    /**
     * Reconstructs the exact state of weekly shifts at a given point in time (replay).
     *
     * @param week Date within the target week
     * @param at Timestamp at which the schedule should be reconstructed
     * @return List of shift DTOs reflecting the schedule state at timestamp {@code at}
     */
    public List<EmployeeShiftResponseDTO> reconstructScheduleAt(LocalDate week, LocalDateTime at) {
        LocalDate monday = week != null ? week.with(DayOfWeek.MONDAY) : timeService.today().with(DayOfWeek.MONDAY);
        LocalDate sunday = monday.plusDays(6);
        LocalDateTime targetTime = at != null ? at : timeService.now();

        List<ShiftAuditLog> logs = auditLogRepository
                .findByDateShiftBetweenAndChangedAtLessThanEqualOrderByChangedAtAsc(monday, sunday, targetTime);

        List<EmployeeShiftResponseDTO> result = new ArrayList<>();
        Set<Long> processedShiftIds = new HashSet<>();

        processAuditLogs(logs, result, processedShiftIds);

        List<EmployeeShift> currentShifts = shiftRepository.findByDateShiftBetween(monday, sunday);
        processLegacyShifts(currentShifts, targetTime, processedShiftIds, result);

        sortReconstructedShifts(result);
        return result;
    }

    private void processAuditLogs(List<ShiftAuditLog> logs,
                                  List<EmployeeShiftResponseDTO> result,
                                  Set<Long> processedShiftIds) {
        Map<Long, ShiftAuditLog> lastLogPerShift = new HashMap<>();
        for (ShiftAuditLog logEntry : logs) {
            lastLogPerShift.put(logEntry.getShiftId(), logEntry);
        }

        for (Map.Entry<Long, ShiftAuditLog> entry : lastLogPerShift.entrySet()) {
            Long shiftId = entry.getKey();
            ShiftAuditLog lastLog = entry.getValue();
            processedShiftIds.add(shiftId);

            if (lastLog.getAction() != ShiftAuditAction.DELETED && lastLog.getNewSnapshot() != null) {
                EmployeeShiftResponseDTO reconstructed = fromJson(lastLog.getNewSnapshot());
                if (reconstructed != null) {
                    result.add(reconstructed);
                }
            }
        }
    }

    private void processLegacyShifts(List<EmployeeShift> currentShifts,
                                     LocalDateTime targetTime,
                                     Set<Long> processedShiftIds,
                                     List<EmployeeShiftResponseDTO> result) {
        for (EmployeeShift current : currentShifts) {
            if (!processedShiftIds.contains(current.getId())) {
                LocalDateTime createdAt = current.getCreatedAt();
                if (createdAt == null || !createdAt.isAfter(targetTime)) {
                    result.add(EmployeeShiftResponseDTO.from(current));
                }
            }
        }
    }

    private void sortReconstructedShifts(List<EmployeeShiftResponseDTO> shifts) {
        shifts.sort(Comparator
                .comparing((EmployeeShiftResponseDTO s) -> s.dateShift() != null ? s.dateShift() : LocalDate.MIN)
                .thenComparing(s -> s.heureDebut() != null ? s.heureDebut() : "")
                .thenComparing(s -> s.userId() != null ? s.userId() : 0L));
    }
}
