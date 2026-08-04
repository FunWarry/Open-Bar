package com.bar.gestioncocktail.dto;

import java.util.List;

/**
 * Generic DTO representing a paginated data response.
 *
 * @param <T> Type of content items
 */
public record PageResponseDTO<T>(
    List<T> content,
    int pageNumber,
    int pageSize,
    long totalElements,
    int totalPages,
    boolean isFirst,
    boolean isLast
) {
    public static <T> PageResponseDTO<T> of(List<T> content, int pageNumber, int pageSize, long totalElements) {
        int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalElements / pageSize) : 1;
        boolean isFirst = pageNumber == 0;
        boolean isLast = pageNumber >= totalPages - 1;
        return new PageResponseDTO<>(content, pageNumber, pageSize, totalElements, totalPages, isFirst, isLast);
    }
}
