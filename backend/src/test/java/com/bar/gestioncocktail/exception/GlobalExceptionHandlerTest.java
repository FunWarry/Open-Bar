package com.bar.gestioncocktail.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler defaultHandler = new GlobalExceptionHandler(new MockEnvironment());

    @Test
    @DisplayName("handleResourceNotFound - returns 404 ErrorResponse")
    void handleResourceNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Resource not found");
        ResponseEntity<ErrorResponse> response = defaultHandler.handleResourceNotFound(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Resource not found");
    }

    @Test
    @DisplayName("handleBusinessException - returns 400 ErrorResponse")
    void handleBusinessException() {
        BusinessException ex = new BusinessException("Business violation");
        ResponseEntity<ErrorResponse> response = defaultHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Business violation");
    }

    @Test
    @DisplayName("handleStockInsuffisant - handled by BusinessException method returning 400")
    void handleStockInsuffisant() {
        StockInsuffisantException ex = new StockInsuffisantException("Stock low");
        ResponseEntity<ErrorResponse> response = defaultHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Stock low");
    }

    @Test
    @DisplayName("handleAuthenticationException - returns 401 ErrorResponse")
    void handleAuthenticationException() {
        org.springframework.security.authentication.BadCredentialsException ex =
                new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        ResponseEntity<ErrorResponse> response = defaultHandler.handleAuthenticationException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid credentials");
    }

    @Test
    @DisplayName("handleAccessDenied - returns 403 ErrorResponse")
    void handleAccessDenied() {
        org.springframework.security.access.AccessDeniedException ex = new org.springframework.security.access.AccessDeniedException("Access denied");
        ResponseEntity<ErrorResponse> response = defaultHandler.handleAccessDenied(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Access denied");
    }

    @Test
    @DisplayName("handleValidationErrors - returns 400 ErrorResponse with field errors")
    void handleValidationErrors() {
        org.springframework.validation.BeanPropertyBindingResult bindingResult =
            new org.springframework.validation.BeanPropertyBindingResult(new Object(), "testObject");
        bindingResult.addError(new org.springframework.validation.FieldError("testObject", "username", "Username is required"));

        org.springframework.web.bind.MethodArgumentNotValidException ex =
            new org.springframework.web.bind.MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<ErrorResponse> response = defaultHandler.handleValidationErrors(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFieldErrors()).containsEntry("username", "Username is required");
    }

    @Test
    @DisplayName("handleGenericException - dev mode returns descriptive exception message")
    void handleGenericException_devMode_returnsOriginalMessage() {
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        GlobalExceptionHandler devHandler = new GlobalExceptionHandler(devEnv);

        Exception ex = new RuntimeException("PostgreSQL table 'users' deadlock on transaction #42");
        ResponseEntity<ErrorResponse> response = devHandler.handleGenericException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Internal Server Error");
        assertThat(response.getBody().getMessage()).isEqualTo("PostgreSQL table 'users' deadlock on transaction #42");
    }

    @Test
    @DisplayName("handleGenericException - dev mode with null message returns fallback message")
    void handleGenericException_devMode_nullMessageReturnsFallback() {
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        GlobalExceptionHandler devHandler = new GlobalExceptionHandler(devEnv);

        Exception ex = new NullPointerException();
        ResponseEntity<ErrorResponse> response = devHandler.handleGenericException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("An unexpected error occurred");
    }

    @Test
    @DisplayName("handleGenericException - prod mode obfuscates technical exception details")
    void handleGenericException_prodMode_obfuscatesErrorMessage() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        GlobalExceptionHandler prodHandler = new GlobalExceptionHandler(prodEnv);

        Exception ex = new RuntimeException("org.postgresql.util.PSQLException: ERROR: relation \"secret_keys\" does not exist");
        ResponseEntity<ErrorResponse> response = prodHandler.handleGenericException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Internal Server Error");
        assertThat(response.getBody().getMessage()).isEqualTo("An internal server error occurred");
    }

    @Test
    @DisplayName("handleGenericException - default constructor without environment returns exception message")
    void handleGenericException_defaultConstructor() {
        Exception ex = new Exception("Unexpected error");
        ResponseEntity<ErrorResponse> response = defaultHandler.handleGenericException(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Unexpected error");
    }
}
