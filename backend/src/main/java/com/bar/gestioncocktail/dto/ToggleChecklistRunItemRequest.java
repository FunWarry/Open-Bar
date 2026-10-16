package com.bar.gestioncocktail.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request payload to mark an individual checklist run task as completed or uncompleted.
 *
 * @param isCompleted   Desired completion state (true to check off, false to uncheck)
 * @param comment       Optional staff remark or observation
 * @param photoProofUrl Optional uploaded photographic compliance proof
 */
public record ToggleChecklistRunItemRequest(
        @JsonAlias({"completed", "isCompleted"})
        @JsonProperty("completed")
        Boolean isCompleted,
        String comment,
        String photoProofUrl
) {
    /**
     * Resolves the desired completion state, falling back to inverting current state if null.
     *
     * @param currentState Current boolean state of the item
     * @return Desired boolean state
     */
    public boolean resolveDesiredState(boolean currentState) {
        if (isCompleted != null) {
            return isCompleted;
        }
        return !currentState;
    }
}

