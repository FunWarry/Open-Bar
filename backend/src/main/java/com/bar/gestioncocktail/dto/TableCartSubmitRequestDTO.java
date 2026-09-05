package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO to lock and submit the consolidated collaborative table cart as an official bar order.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload to lock and submit the consolidated table cart")
public class TableCartSubmitRequestDTO {

    @NotBlank(message = "Guest session ID is required")
    @Size(max = 64, message = "Guest session ID cannot exceed 64 characters")
    @Schema(description = "Identifier of guest who locked and submitted the order", example = "a3f56e18-6c8a-4d2b-980b-df0e2cf7d1c1")
    private String guestSessionId;

    @NotBlank(message = "Guest name is required")
    @Size(max = 100, message = "Guest name cannot exceed 100 characters")
    @Schema(description = "Name of guest who submitted the order", example = "Alex")
    private String guestName;

    @Size(max = 2000, message = "General order notes cannot exceed 2000 characters")
    @Schema(description = "General preparation notes for the table order", example = "All drinks at once please")
    private String notes;

    @Size(max = 64, message = "Session token cannot exceed 64 characters")
    @Schema(description = "Ephemeral table session token for anti-fraud validation", example = "4e389d44-0b1e-451e-b83b-9e236ceb348d")
    private String sessionToken;
}
