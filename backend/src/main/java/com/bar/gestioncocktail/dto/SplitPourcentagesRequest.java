package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Request DTO representing custom percentage distribution among patrons.
 *
 * @param parts List of individual guest percentage allocations
 */
@Schema(description = "Bill split request by percentage")
public record SplitPourcentagesRequest(
    @Schema(description = "List of guest percentage allocations")
    @NotEmpty(message = "Parts list must not be empty")
    List<@Valid SplitPourcentagePartRequest> parts
) {}
