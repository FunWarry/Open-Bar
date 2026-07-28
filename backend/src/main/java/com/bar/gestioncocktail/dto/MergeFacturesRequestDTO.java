package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MergeFacturesRequestDTO(
    @NotEmpty(message = "La liste des factures est obligatoire")
    @Size(min = 2, message = "Au moins 2 factures sont requises pour effectuer une fusion")
    List<Long> factureIds,
    Long targetTableId
) {}
