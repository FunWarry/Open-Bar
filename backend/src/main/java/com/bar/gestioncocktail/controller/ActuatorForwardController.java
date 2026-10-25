package com.bar.gestioncocktail.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.io.File;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * REST controller exposing application health and runtime info endpoints
 * compatible with Spring Boot Actuator paths ({@code /actuator/health}, {@code /api/actuator/health}).
 */
@Tag(name = "Actuator Health & Info", description = "Endpoints for container healthchecks, database connectivity, and runtime diagnostics")
@RestController
@RequestMapping({"/actuator", "/api/actuator"})
public class ActuatorForwardController {

    private static final Logger log = LoggerFactory.getLogger(ActuatorForwardController.class);
    private static final long MIN_DISK_THRESHOLD_BYTES = 1024L * 1024L * 1024L; // 1GB
    private static final String KEY_STATUS = "status";
    private static final String KEY_VERSION = "version";
    private static final String KEY_ERROR = "error";

    private final DataSource dataSource;
    private final String appVersion;

    /**
     * Constructs ActuatorForwardController with data source and configured application version.
     *
     * @param dataSource DataSource for database health validation
     * @param appVersion Configured application version string
     */
    public ActuatorForwardController(
            DataSource dataSource,
            @Value("${openbar.version:0.8.0}") String appVersion) {
        this.dataSource = dataSource;
        this.appVersion = appVersion;
    }

    /**
     * Retrieves application health status (database connectivity, disk space).
     *
     * @return 200 OK with status UP, or 503 Service Unavailable with status DOWN
     */
    @Operation(summary = "Get application health status", description = "Public healthcheck endpoint for Docker containers and OTA update validation.")
    @ApiResponse(responseCode = "200", description = "Application and database are healthy (UP)")
    @ApiResponse(responseCode = "503", description = "Application or database is unhealthy (DOWN)")
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        Map<String, Object> components = new LinkedHashMap<>();
        boolean isOverallHealthy = true;

        // 1. Database Check
        Map<String, Object> dbDetails = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection()) {
            boolean isValid = connection.isValid(2);
            if (isValid) {
                dbDetails.put(KEY_STATUS, "UP");
                dbDetails.put("database", connection.getMetaData().getDatabaseProductName());
                dbDetails.put(KEY_VERSION, connection.getMetaData().getDatabaseProductVersion());
            } else {
                isOverallHealthy = false;
                dbDetails.put(KEY_STATUS, "DOWN");
                dbDetails.put(KEY_ERROR, "Database connection validation failed");
            }
        } catch (Exception ex) {
            isOverallHealthy = false;
            log.warn("Database healthcheck failed: {}", ex.getMessage());
            dbDetails.put(KEY_STATUS, "DOWN");
            dbDetails.put(KEY_ERROR, ex.getMessage());
        }
        components.put("db", dbDetails);

        // 2. Disk Space Check
        Map<String, Object> diskDetails = new LinkedHashMap<>();
        try {
            File root = new File(".");
            long freeBytes = root.getUsableSpace();
            long totalBytes = root.getTotalSpace();
            boolean isDiskHealthy = freeBytes >= MIN_DISK_THRESHOLD_BYTES;
            diskDetails.put(KEY_STATUS, isDiskHealthy ? "UP" : "DOWN");
            diskDetails.put("free", freeBytes);
            diskDetails.put("total", totalBytes);
            diskDetails.put("threshold", MIN_DISK_THRESHOLD_BYTES);
            if (!isDiskHealthy) {
                isOverallHealthy = false;
            }
        } catch (Exception ex) {
            diskDetails.put(KEY_STATUS, "UNKNOWN");
            diskDetails.put(KEY_ERROR, ex.getMessage());
        }
        components.put("diskSpace", diskDetails);

        response.put(KEY_STATUS, isOverallHealthy ? "UP" : "DOWN");
        response.put("components", components);

        return ResponseEntity.status(isOverallHealthy ? 200 : 503).body(response);
    }

    /**
     * Retrieves application metadata and runtime info.
     *
     * @return 200 OK with version, Java runtime, and platform details
     */
    @Operation(summary = "Get application info", description = "Retrieves version and platform metadata.")
    @ApiResponse(responseCode = "200", description = "Info retrieved successfully")
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getInfo() {
        Map<String, Object> app = Map.of(
                "name", "OpenBar",
                KEY_VERSION, appVersion,
                "description", "Système de gestion de bar et restaurant autonome"
        );
        Map<String, Object> javaInfo = Map.of(
                KEY_VERSION, System.getProperty("java.version", "22"),
                "vendor", System.getProperty("java.vendor", "OpenJDK")
        );
        return ResponseEntity.ok(Map.of(
                "app", app,
                "java", javaInfo
        ));
    }
}
