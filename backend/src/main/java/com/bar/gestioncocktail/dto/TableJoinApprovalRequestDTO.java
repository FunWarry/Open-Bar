package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload sent by a table owner to approve or decline a join request.
 */
@Schema(description = "Table owner approval action payload")
public record TableJoinApprovalRequestDTO(
        @NotBlank(message = "Owner session ID is required")
        @Schema(description = "Session UUID of the claiming owner", example = "owner-uuid-1234")
        String ownerSessionId,

        @NotNull(message = "Approval status must be specified")
        @Schema(description = "Whether the request is accepted (true) or rejected (false)", example = "true")
        Boolean approved
) {}
