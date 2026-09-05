package com.bar.gestioncocktail.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global REST exception handler for OpenBar API (ControllerAdvice).
 * Intercepts business exceptions, Bean validation errors, and infrastructure failures to return unified {@link ErrorResponse} payloads.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String GENERIC_PROD_ERROR_MESSAGE = "An internal server error occurred";

    private final org.springframework.core.env.Environment environment;

    /**
     * Constructs a GlobalExceptionHandler with Spring Environment for profile-aware error handling.
     *
     * @param environment Spring environment to inspect active profiles
     */
    public GlobalExceptionHandler(org.springframework.core.env.Environment environment) {
        this.environment = environment;
    }

    /**
     * Handles resource not found exceptions (HTTP 404).
     *
     * @param ex Intercepted exception
     * @return HTTP 404 response
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        ErrorResponse body = ErrorResponse.builder(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        ).build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    /**
     * Handles business rule violations (HTTP 400).
     *
     * @param ex Intercepted business exception
     * @return HTTP 400 response
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        ErrorResponse body = ErrorResponse.builder(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        ).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Handles authentication failures (HTTP 401).
     *
     * @param ex Authentication exception
     * @return HTTP 401 response
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex) {
        ErrorResponse body = ErrorResponse.builder(
                HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized",
                ex.getMessage()
        ).build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    /**
     * Handles access denied exceptions (HTTP 403).
     *
     * @param ex Access denied exception
     * @return HTTP 403 response
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        ErrorResponse body = ErrorResponse.builder(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage()
        ).build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /**
     * Handles Bean validation errors (HTTP 400 with field details).
     *
     * @param ex Validation exception
     * @return HTTP 400 response with field error map
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value",
                        (existing, replacement) -> existing
                ));
        ErrorResponse body = ErrorResponse.builder(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                "One or more fields are invalid"
        ).fieldErrors(fieldErrors).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Handles uncaught generic exceptions (HTTP 500).
     * In production profile, internal technical error details are obfuscated to avoid information leakage,
     * while logging full diagnostic stack traces server-side for auditing.
     *
     * @param ex Generic exception
     * @return HTTP 500 response
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled internal server exception: {}", ex.getMessage(), ex);

        String message;
        if (isProdProfile()) {
            message = GENERIC_PROD_ERROR_MESSAGE;
        } else {
            message = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred";
        }

        ErrorResponse body = ErrorResponse.builder(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                message
        ).build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private boolean isProdProfile() {
        return environment != null && environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"));
    }
}
