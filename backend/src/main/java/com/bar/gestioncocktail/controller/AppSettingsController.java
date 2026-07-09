package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.service.AppSettingsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET est public (permitAll dans SecurityConfig) : les réglages de personnalisation
 * doivent être lisibles dès l'écran de login, avant authentification.
 */
@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    @Autowired
    public AppSettingsController(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    @GetMapping
    public ResponseEntity<AppSettingsResponseDTO> getSettings() {
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.getSettings()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppSettingsResponseDTO> updateSettings(@Valid @RequestBody AppSettingsUpdateRequest request) {
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.updateSettings(request)));
    }
}
