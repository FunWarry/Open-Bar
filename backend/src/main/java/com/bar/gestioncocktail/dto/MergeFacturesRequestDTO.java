package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MergeFacturesRequestDTO(
    @NotEmpty(message = "Invoice list is required")
    @Size(min = 2, message = "Au moins 2 factures sont requises pour effectuer une fusion")
    List<Long> factureIds,
    Long targetTableId
) {}
