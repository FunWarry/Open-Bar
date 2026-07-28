package com.bar.gestioncocktail.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("handleResourceNotFound - returns 404 ErrorResponse")
    void handleResourceNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Resource not found");
        ResponseEntity<ErrorResponse> response = handler.handleResourceNotFound(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Resource not found");
    }

    @Test
    @DisplayName("handleBusinessException - returns 400 ErrorResponse")
    void handleBusinessException() {
        BusinessException ex = new BusinessException("Business violation");
        ResponseEntity<ErrorResponse> response = handler.handleBusinessException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Business violation");
    }

    @Test
    @DisplayName("handleStockInsuffisant - handled by BusinessException method returning 400")
    void handleStockInsuffisant() {
        StockInsuffisantException ex = new StockInsuffisantException("Stock low");
        ResponseEntity<ErrorResponse> response = handler.handleBusinessException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Stock low");
    }

    @Test
    @DisplayName("handleGenericException - returns 500 ErrorResponse")
    void handleGenericException() {
        Exception ex = new Exception("Unexpected error");
        ResponseEntity<ErrorResponse> response = handler.handleGenericException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
    }
}
