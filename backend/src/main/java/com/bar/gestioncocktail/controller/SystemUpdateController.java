package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SystemPreFlightDTO;
import com.bar.gestioncocktail.dto.SystemSnapshotDTO;
import com.bar.gestioncocktail.dto.SystemUpdateCheckDTO;
import com.bar.gestioncocktail.dto.SystemUpdateRequest;
import com.bar.gestioncocktail.dto.SystemUpdateStatusDTO;
import com.bar.gestioncocktail.dto.SystemVersionDTO;
import com.bar.gestioncocktail.dto.UpdateChannel;
import com.bar.gestioncocktail.service.SystemUpdateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST controller for system administration, Over-The-Air (OTA) updates,
 * version diagnostics, pre-flight safety checks, and disaster recovery snapshot management.
 */
@Tag(name = "System Updates & Maintenance", description = "Endpoints for OTA updates, system version checks, pre-update snapshots, and auto-rollback")
@RestController
@RequestMapping("/api/admin/system")
public class SystemUpdateController {

    private final SystemUpdateService systemUpdateService;

    /**
     * Constructs SystemUpdateController with the system update service.
     *
     * @param systemUpdateService Service managing OTA updates and snapshots
     */
    public SystemUpdateController(SystemUpdateService systemUpdateService) {
        this.systemUpdateService = systemUpdateService;
    }

    /**
     * Retrieves current running version and host system diagnostic info.
     *
     * @return 200 OK with system version and disk capacity metrics
     */
    @Operation(summary = "Get system version info", description = "Retrieves installed version, JVM version, OS, uptime, and disk usage.")
    @ApiResponse(responseCode = "200", description = "System version information retrieved successfully")
    @GetMapping("/version")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<SystemVersionDTO> getVersionInfo() {
        return ResponseEntity.ok(systemUpdateService.getSystemVersionInfo());
    }

    /**
     * Queries GitHub Releases API to discover new versions on the specified release channel.
     *
     * @param channel Release channel to inspect (STABLE or BETA, default STABLE)
     * @return 200 OK with release notes, changelog highlights, and update availability
     */
    @Operation(summary = "Check for system updates", description = "Checks GitHub Releases API for newer software releases with graceful offline fallback.")
    @ApiResponse(responseCode = "200", description = "Update availability check completed")
    @GetMapping("/check-update")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<SystemUpdateCheckDTO> checkForUpdates(
            @RequestParam(name = "channel", required = false, defaultValue = "STABLE") UpdateChannel channel) {
        return ResponseEntity.ok(systemUpdateService.checkForUpdates(channel));
    }

    /**
     * Retrieves live progress and execution status of the running or latest OTA update.
     *
     * @return 200 OK with update status, current step, and diagnostic logs
     */
    @Operation(summary = "Get update progress status", description = "Returns active or recent OTA update status, progress percentage, and log snippets.")
    @ApiResponse(responseCode = "200", description = "Update status retrieved successfully")
    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<SystemUpdateStatusDTO> getUpdateStatus() {
        return ResponseEntity.ok(systemUpdateService.getUpdateStatus());
    }

    /**
     * Executes pre-flight safety validations (available disk space, occupied tables, preparing orders).
     *
     * @return 200 OK with pre-flight metrics and administrative warning messages
     */
    @Operation(summary = "Run update pre-flight checks", description = "Validates free disk space and active bar activity prior to initiating system reboot.")
    @ApiResponse(responseCode = "200", description = "Pre-flight checks evaluated")
    @GetMapping("/preflight")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<SystemPreFlightDTO> getPreFlight() {
        return ResponseEntity.ok(systemUpdateService.getPreFlightCheck());
    }

    /**
     * Initiates an automated Over-The-Air software update in a background orchestrator process.
     *
     * @param request Update parameters (target version and channel)
     * @return 200 OK with initialized update status
     */
    @Operation(summary = "Trigger OTA system update", description = "Restricted to ADMIN role. Creates pre-update database snapshot, updates Docker containers, and executes healthcheck with auto-rollback.")
    @ApiResponse(responseCode = "200", description = "System update initiated successfully")
    @ApiResponse(responseCode = "400", description = "Update already running or pre-flight disk check failed")
    @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role")
    @PostMapping("/update")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemUpdateStatusDTO> triggerUpdate(@Valid @RequestBody SystemUpdateRequest request) {
        return ResponseEntity.ok(systemUpdateService.triggerUpdate(request));
    }

    /**
     * Lists archived pre-update database and container snapshots available for rollback.
     *
     * @return 200 OK with list of snapshots
     */
    @Operation(summary = "List pre-update snapshots", description = "Lists recent local backup snapshots with file sizes and source/target version tags.")
    @ApiResponse(responseCode = "200", description = "Snapshots listed successfully")
    @GetMapping("/snapshots")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<SystemSnapshotDTO>> listSnapshots() {
        return ResponseEntity.ok(systemUpdateService.listSnapshots());
    }

    /**
     * Restores an archived database snapshot and rolls back application containers.
     *
     * @param id Snapshot identifier to restore
     * @return 200 OK with confirmation message
     */
    @Operation(summary = "Restore system snapshot (Rollback)", description = "Restricted to ADMIN role. Restores pre-update PostgreSQL database dump and previous container version.")
    @ApiResponse(responseCode = "200", description = "Snapshot restoration initiated")
    @ApiResponse(responseCode = "404", description = "Snapshot not found")
    @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role")
    @PostMapping("/snapshots/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> restoreSnapshot(@PathVariable("id") String id) {
        return ResponseEntity.ok(systemUpdateService.restoreSnapshot(id));
    }

    /**
     * Deletes a specified backup snapshot and its companion metadata.
     *
     * @param id Snapshot identifier to remove
     * @return 204 No Content
     */
    @Operation(summary = "Delete backup snapshot", description = "Restricted to ADMIN role. Permanently deletes pre-update snapshot archive.")
    @ApiResponse(responseCode = "204", description = "Snapshot deleted successfully")
    @ApiResponse(responseCode = "404", description = "Snapshot not found")
    @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role")
    @DeleteMapping("/snapshots/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSnapshot(@PathVariable("id") String id) {
        systemUpdateService.deleteSnapshot(id);
        return ResponseEntity.noContent().build();
    }
}
