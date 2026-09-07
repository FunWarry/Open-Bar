package com.bar.gestioncocktail.dto;

import java.util.List;
/**
 * Request DTO for calculating item-based bill splitting among seated patrons.
 */

public record SplitAdditionRequest(List<SplitPartRequest> parts) {}
