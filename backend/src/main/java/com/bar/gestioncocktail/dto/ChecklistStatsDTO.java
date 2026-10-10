package com.bar.gestioncocktail.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

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
    /**
     * Alias for activeTemplatesCount for frontend compatibility.
     *
     * @return count of templates
     */
    @JsonProperty("totalTemplatesCount")
    public long totalTemplatesCount() {
        return activeTemplatesCount;
    }

    /**
     * Alias for averageCompletionPercentageToday for frontend compatibility.
     *
     * @return daily completion percentage
     */
    @JsonProperty("completionRateToday")
    public int completionRateToday() {
        return averageCompletionPercentageToday;
    }
}
