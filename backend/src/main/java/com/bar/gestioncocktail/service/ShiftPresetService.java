package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ShiftPresetDTO;
import com.bar.gestioncocktail.model.ShiftPreset;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.repository.ShiftPresetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for managing shift template presets (horaires par défaut par type de créneau).
 */
@Service
@Transactional(readOnly = true)
public class ShiftPresetService {

    private static final String TIME_MIDNIGHT = "00:00";

    private final ShiftPresetRepository presetRepository;

    public ShiftPresetService(ShiftPresetRepository presetRepository) {
        this.presetRepository = presetRepository;
    }

    /**
     * Returns all shift presets, populating defaults if table is empty.
     *
     * @return List of ShiftPresetDTO
     */
    @Transactional
    public List<ShiftPresetDTO> getAllPresets() {
        if (presetRepository.count() == 0) {
            populateDefaultsInternal();
        }
        return presetRepository.findAll().stream()
                .map(ShiftPresetDTO::from)
                .toList();
    }

    /**
     * Gets a single preset by its TypeShift.
     *
     * @param typeShift Target TypeShift
     * @return ShiftPresetDTO
     */
    public ShiftPresetDTO getPresetByType(TypeShift typeShift) {
        return presetRepository.findByTypeShift(typeShift)
                .map(ShiftPresetDTO::from)
                .orElse(null);
    }

    /**
     * Creates or updates a shift preset.
     *
     * @param typeShift TypeShift enum
     * @param dto Input DTO details
     * @return Updated ShiftPresetDTO
     */
    @Transactional
    public ShiftPresetDTO updatePreset(TypeShift typeShift, ShiftPresetDTO dto) {
        ShiftPreset preset = presetRepository.findByTypeShift(typeShift)
                .orElseGet(() -> {
                    ShiftPreset p = new ShiftPreset();
                    p.setTypeShift(typeShift);
                    return p;
                });

        preset.setNom(dto.nom() != null ? dto.nom() : typeShift.name());
        preset.setHeureDebut(dto.heureDebut());
        preset.setHeureFin(dto.heureFin());
        if (dto.dureePauseMinutes() != null) {
            preset.setDureePauseMinutes(dto.dureePauseMinutes());
        }

        ShiftPreset saved = presetRepository.save(preset);
        return ShiftPresetDTO.from(saved);
    }

    /**
     * Initializes standard shift template presets.
     */
    @Transactional
    public void initDefaultPresets() {
        populateDefaultsInternal();
    }

    private void populateDefaultsInternal() {
        if (presetRepository.findByTypeShift(TypeShift.MATIN).isEmpty()) {
            presetRepository.save(new ShiftPreset(TypeShift.MATIN, "Service Matin", "08:00", "16:00", 30));
        }
        if (presetRepository.findByTypeShift(TypeShift.SOIR).isEmpty()) {
            presetRepository.save(new ShiftPreset(TypeShift.SOIR, "Service Soir", "16:00", TIME_MIDNIGHT, 30));
        }
        if (presetRepository.findByTypeShift(TypeShift.COUPURE).isEmpty()) {
            presetRepository.save(new ShiftPreset(TypeShift.COUPURE, "Service Coupure", "11:00", "22:00", 120));
        }
        if (presetRepository.findByTypeShift(TypeShift.NUIT).isEmpty()) {
            presetRepository.save(new ShiftPreset(TypeShift.NUIT, "Service Nuit", "22:00", "06:00", 30));
        }
        if (presetRepository.findByTypeShift(TypeShift.CONGE).isEmpty()) {
            presetRepository.save(new ShiftPreset(TypeShift.CONGE, "Congé / Absence", TIME_MIDNIGHT, TIME_MIDNIGHT, 0));
        }
    }
}
