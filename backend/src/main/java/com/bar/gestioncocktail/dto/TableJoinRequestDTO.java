package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Payload for submitting or inspecting a request to join an occupied table session.
 */
@Schema(description = "Table join authorization request")
public record TableJoinRequestDTO(
        @Schema(description = "Request identifier", example = "12")
        Long id,

        @Schema(description = "Table identifier", example = "9")
        Long tableId,

        @NotBlank(message = "Applicant session ID is required")
        @Size(max = 64, message = "Applicant session ID cannot exceed 64 characters")
        @Schema(description = "Applicant guest session UUID", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String applicantSessionId,

        @NotBlank(message = "Applicant name is required")
        @Size(max = 100, message = "Applicant name cannot exceed 100 characters")
        @Schema(description = "Applicant nickname", example = "Sarah")
        String applicantName,

        @Schema(description = "Current request status (PENDING, APPROVED, REJECTED)", example = "PENDING")
        String status,

        @Schema(description = "Session token returned upon approval")
        String sessionToken,

        @Schema(description = "Creation timestamp")
        LocalDateTime createdAt
) {
    public static TableJoinRequestDTO from(com.bar.gestioncocktail.model.TableJoinRequest req, String sessionToken) {
        return new TableJoinRequestDTO(
                req.getId(),
                req.getTableId(),
                req.getApplicantSessionId(),
                req.getApplicantName(),
                req.getStatus().name(),
                sessionToken,
                req.getCreatedAt()
        );
    }
}
