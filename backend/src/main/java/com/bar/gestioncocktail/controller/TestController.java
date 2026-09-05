package com.bar.gestioncocktail.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Utility REST controller for health checks and connectivity diagnostics.
 */
@RestController
@RequestMapping("/api/test")
@Tag(name = "Health Check & Test", description = "Backend service health checks and diagnostics")
public class TestController {

    /**
     * Public backend service health check endpoint.
     *
     * @return Confirmation message indicating service is operational
     */
    @GetMapping("/health")
    @Operation(summary = "Server health check", description = "Public endpoint returning 200 OK if backend is operational.")
    @ApiResponse(responseCode = "200", description = "Service operational")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Service is up and running");
    }

    /**
     * Authenticated diagnostic test endpoint.
     *
     * @return Confirmation message
     */
    @GetMapping("/blocked")
    @Operation(summary = "Authenticated diagnostic test endpoint", description = "Requires valid JWT authentication.")
    @ApiResponse(responseCode = "200", description = "Access granted")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Test endpoint is blocking");
    }
}
