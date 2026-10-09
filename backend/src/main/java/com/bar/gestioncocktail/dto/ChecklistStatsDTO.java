package com.bar.gestioncocktail.dto;

/**
 * Summary metrics of checklist procedures and daily operational execution.
 *
 * @param activeRunsCount                  Count of checklist runs currently in progress
 * @param completedTodayCount              Count of runs finalized today
 * @param activeTemplatesCount             Count of active templates available
 * @param averageCompletionPercentageToday Average completion rate of today's runs
 */
public record ChecklistStatsDTO(
        long activeRunsCount,
        long completedTodayCount,
        long activeTemplatesCount,
        int averageCompletionPercentageToday
) {
}
