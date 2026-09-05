package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for placing a public order via table QR code.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Anonymous order request via QR code scan")
public class PublicCommandeRequestDTO {

    /**
     * Table identifier scanned by patron.
     */
    @NotNull(message = "Table is required")
    @Schema(description = "Scanned table ID", example = "5")
    private Long tableId;

    /**
     * List of ordered cocktails and variants.
     */
    @NotEmpty(message = "Item list cannot be empty")
    @Valid
    @Schema(description = "List of ordered items")
    private List<PublicCommandeItemRequestDTO> items;

    /**
     * Customer notes (e.g. "No ice").
     */
    @Size(max = 2000, message = "Customer notes cannot exceed 2000 characters")
    @Schema(description = "Customer preparation notes", example = "No ice")
    private String notes;

    /**
     * Ephemeral table session token for anti-fraud validation.
     */
    @Size(max = 64, message = "Session token cannot exceed 64 characters")
    @Schema(description = "Ephemeral table session token", example = "4e389d44-0b1e-451e-b83b-9e236ceb348d")
    private String sessionToken;

    /**
     * Backwards-compatible convenience constructor without session token.
     *
     * @param tableId Table identifier
     * @param items Ordered items list
     * @param notes Optional preparation notes
     */
    public PublicCommandeRequestDTO(Long tableId, List<PublicCommandeItemRequestDTO> items, String notes) {
        this.tableId = tableId;
        this.items = items;
        this.notes = notes;
        this.sessionToken = null;
    }
}
