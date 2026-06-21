package com.bar.gestioncocktail.dto;

import java.util.List;

public record SplitPartRequest(String nomConvive, List<Long> itemIds) {}
