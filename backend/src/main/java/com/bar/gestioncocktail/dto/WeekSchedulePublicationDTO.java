package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.WeekSchedulePublication;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Record DTO representing the publication state of a weekly schedule.
 *
 * @param id           Publication record identifier
 * @param weekStart    ISO date of the Monday of the published week
 * @param publishedAt  Timestamp of the most recent publication
 * @param publishedBy  Username of the manager who published the planning
 * @param snapshotJson JSON snapshot of the shifts when published
 */
public record WeekSchedulePublicationDTO(
        Long id,
        LocalDate weekStart,
        LocalDateTime publishedAt,
        String publishedBy,
        String snapshotJson
) {
    /**
     * Maps a {@link WeekSchedulePublication} entity to its DTO representation.
     *
     * @param entity Source JPA entity
     * @return Corresponding DTO
     */
    public static WeekSchedulePublicationDTO from(WeekSchedulePublication entity) {
        return new WeekSchedulePublicationDTO(
                entity.getId(),
                entity.getWeekStart(),
                entity.getPublishedAt(),
                entity.getPublishedBy(),
                entity.getSnapshotJson()
        );
    }
}
