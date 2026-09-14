package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Request DTO representing custom monetary amount distribution among patrons.
 *
 * @param parts List of individual guest amount allocations
 */
@Schema(description = "Bill split request by custom amounts")
public record SplitMontantsRequest(
    @Schema(description = "List of guest amount allocations")
    @NotEmpty(message = "Parts list must not be empty")
    List<@Valid SplitMontantPartRequest> parts
) {}
