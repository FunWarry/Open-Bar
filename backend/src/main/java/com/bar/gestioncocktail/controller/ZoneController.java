package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.ZoneEntity;
import com.bar.gestioncocktail.service.ZoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing bar zones and their floor level categorizations.
 */
@RestController
@RequestMapping("/api/zones")
@Tag(name = "Zones", description = "Endpoints pour la gestion des zones et étages")
public class ZoneController {
    private final ZoneService zoneService;

    public ZoneController(ZoneService zoneService) {
        this.zoneService = zoneService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister toutes les zones avec leurs étages")
    @ApiResponse(responseCode = "200", description = "Zones récupérées avec succès")
    public ResponseEntity<List<ZoneEntity>> getAllZones() {
        return ResponseEntity.ok(zoneService.getAllZones());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir une zone par son ID")
    @ApiResponse(responseCode = "200", description = "Zone récupérée")
    public ResponseEntity<ZoneEntity> getZoneById(@PathVariable Long id) {
        return ResponseEntity.ok(zoneService.getZoneById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Créer une nouvelle zone")
    @ApiResponse(responseCode = "200", description = "Zone créée")
    public ResponseEntity<ZoneEntity> createZone(@RequestBody ZoneEntity zone) {
        return ResponseEntity.ok(zoneService.createZone(zone));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Modifier une zone (nom, étage)")
    @ApiResponse(responseCode = "200", description = "Zone mise à jour")
    public ResponseEntity<ZoneEntity> updateZone(@PathVariable Long id, @RequestBody ZoneEntity zone) {
        return ResponseEntity.ok(zoneService.updateZone(id, zone));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Supprimer une zone")
    @ApiResponse(responseCode = "204", description = "Zone supprimée")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id) {
        zoneService.deleteZone(id);
        return ResponseEntity.noContent().build();
    }
}
