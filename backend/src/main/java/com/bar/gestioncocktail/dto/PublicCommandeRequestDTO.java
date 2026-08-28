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
}
