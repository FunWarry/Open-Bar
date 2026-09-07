package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.dto.EstablishmentModulesDTO;
import com.bar.gestioncocktail.dto.EstablishmentModulesUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import com.bar.gestioncocktail.util.SiretLuhnValidator;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing legal establishment configuration parameters and modular capability flags.
 */
@Service
public class EstablishmentConfigService {

    private final EstablishmentConfigRepository establishmentConfigRepository;
    private final NotificationService notificationService;

    /**
     * Constructs EstablishmentConfigService with repository and real-time notification service.
     *
     * @param establishmentConfigRepository Repository for establishment config persistence
     * @param notificationService           Service for STOMP WebSocket broadcasts
     */
    public EstablishmentConfigService(EstablishmentConfigRepository establishmentConfigRepository,
                                      @Lazy NotificationService notificationService) {
        this.establishmentConfigRepository = establishmentConfigRepository;
        this.notificationService = notificationService;
    }

    /**
     * Retrieves existing configuration entity or creates standard singleton instance if not found.
     * Uses REQUIRES_NEW propagation so potential query errors do not abort outer caller transactions.
     *
     * @return current {@link EstablishmentConfig}
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public EstablishmentConfig getConfig() {
        return getConfigInternal();
    }

    private EstablishmentConfig getConfigInternal() {
        EstablishmentConfig config = establishmentConfigRepository.findById(EstablishmentConfig.SINGLETON_ID)
            .orElseGet(() -> {
                EstablishmentConfig newConfig = new EstablishmentConfig();
                newConfig.setId(EstablishmentConfig.SINGLETON_ID);
                return establishmentConfigRepository.save(newConfig);
            });

        if (config.getSiret() == null || !SiretLuhnValidator.isValidSiret(config.getSiret())) {
            config.setSiret("73282932000074");
            try {
                config = establishmentConfigRepository.save(config);
            } catch (Exception _) {
                // If in read-only transaction, in-memory config is still valid
            }
        }
        return config;
    }

    /**
     * Retrieves current establishment configuration as a DTO.
     *
     * @return {@link EstablishmentConfigDTO}
     */
    @Transactional
    public EstablishmentConfigDTO getConfigDTO() {
        return EstablishmentConfigDTO.from(getConfigInternal());
    }

    /**
     * Checks if a given capability module is currently enabled for the establishment.
     *
     * @param module Capability module to check
     * @return True if enabled, false otherwise (defaults to true if module is null)
     */
    @Transactional(readOnly = true)
    public boolean isModuleEnabled(EstablishmentModule module) {
        if (module == null) {
            return true;
        }
        return getConfigInternal().isModuleEnabled(module);
    }

    /**
     * Asserts that a given capability module is enabled, otherwise throwing a {@link BusinessException}.
     *
     * @param module Module to verify
     * @throws BusinessException if the capability module is disabled
     */
    @Transactional(readOnly = true)
    public void checkModuleEnabled(EstablishmentModule module) {
        if (module != null && !getConfigInternal().isModuleEnabled(module)) {
            throw new BusinessException("Module '" + module + "' is currently disabled for this establishment");
        }
    }

    /**
     * Retrieves the current configuration status of all modular establishment capabilities.
     *
     * @return {@link EstablishmentModulesDTO}
     */
    @Transactional(readOnly = true)
    public EstablishmentModulesDTO getModulesDTO() {
        return EstablishmentModulesDTO.from(getConfigInternal());
    }

    /**
     * Updates modular capabilities configuration and broadcasts the update over WebSocket.
     *
     * @param request Update payload with desired module states
     * @return Updated modules DTO
     */
    @Transactional
    public EstablishmentModulesDTO updateModules(EstablishmentModulesUpdateRequest request) {
        if (request == null) {
            return EstablishmentModulesDTO.from(getConfigInternal());
        }
        EstablishmentConfig config = getConfigInternal();
        applyModuleUpdates(config, request);
        EstablishmentConfig saved = establishmentConfigRepository.save(config);
        EstablishmentModulesDTO modulesDTO = EstablishmentModulesDTO.from(saved);
        if (notificationService != null) {
            notificationService.notifierModulesMisAJour(modulesDTO);
        }
        return modulesDTO;
    }

    /**
     * Updates legal establishment configuration with Luhn validation on SIRET.
     *
     * @param request the request containing updated fields
     * @return updated {@link EstablishmentConfigDTO}
     */
    @Transactional
    public EstablishmentConfigDTO updateConfig(EstablishmentConfigUpdateRequest request) {
        if (request.siret() != null && !request.siret().isBlank() && !SiretLuhnValidator.isValidSiret(request.siret())) {
            throw new BusinessException("The specified SIRET number is invalid (Luhn checksum failed)");
        }

        EstablishmentConfig config = getConfigInternal();
        applyUpdates(config, request);

        EstablishmentConfig saved = establishmentConfigRepository.save(config);
        EstablishmentConfigDTO dto = EstablishmentConfigDTO.from(saved);
        if (request.modules() != null && notificationService != null) {
            notificationService.notifierModulesMisAJour(dto.modules());
        }
        return dto;
    }

    private void applyUpdates(EstablishmentConfig config, EstablishmentConfigUpdateRequest request) {
        applyLegalInfoUpdates(config, request);
        applyContactAndPolicyUpdates(config, request);
        applyTimeZoneUpdate(config, request.timeZone());
        applyTicketFormatUpdate(config, request.ticketFormat());
        if (request.modules() != null) {
            applyModuleUpdates(config, request.modules());
        }
    }

    private void applyModuleUpdates(EstablishmentConfig config, EstablishmentModulesUpdateRequest request) {
        if (request == null) {
            return;
        }
        if (request.cuisineKds() != null) config.setModuleKitchenKdsEnabled(request.cuisineKds());
        if (request.happyHour() != null) config.setModuleHappyHourEnabled(request.happyHour());
        if (request.employeeManagement() != null) config.setModuleEmployeeManagementEnabled(request.employeeManagement());
        if (request.floorPlan() != null) config.setModuleFloorPlanEnabled(request.floorPlan());
        if (request.qrClientOrdering() != null) config.setModuleQrClientOrderingEnabled(request.qrClientOrdering());
        if (request.stockTracking() != null) config.setModuleStockTrackingEnabled(request.stockTracking());
    }

    private void applyLegalInfoUpdates(EstablishmentConfig config, EstablishmentConfigUpdateRequest request) {
        if (request.legalName() != null) config.setLegalName(request.legalName());
        if (request.legalForm() != null) config.setLegalForm(request.legalForm());
        if (request.siret() != null) config.setSiret(request.siret());
        if (request.rcsCity() != null) config.setRcsCity(request.rcsCity());
        if (request.rcsNumber() != null) config.setRcsNumber(request.rcsNumber());
        if (request.tvaNumber() != null) config.setTvaNumber(request.tvaNumber());
        if (request.codeApe() != null) config.setCodeApe(request.codeApe());
        if (request.capitalSocial() != null) config.setCapitalSocial(request.capitalSocial());
    }

    private void applyContactAndPolicyUpdates(EstablishmentConfig config, EstablishmentConfigUpdateRequest request) {
        if (request.address() != null) config.setAddress(request.address());
        if (request.country() != null) config.setCountry(request.country());
        if (request.language() != null) config.setLanguage(request.language());
        if (request.phone() != null) config.setPhone(request.phone());
        if (request.email() != null) config.setEmail(request.email());
        if (request.paymentTerms() != null) config.setPaymentTerms(request.paymentTerms());
        if (request.discountPolicy() != null) config.setDiscountPolicy(request.discountPolicy());
        if (request.latePaymentRate() != null) config.setLatePaymentRate(request.latePaymentRate());
    }

    private void applyTicketFormatUpdate(EstablishmentConfig config, String ticketFormat) {
        if (ticketFormat == null) return;
        String fmt = ticketFormat.trim().toLowerCase();
        if ("80mm".equals(fmt) || "58mm".equals(fmt)) {
            config.setTicketFormat(fmt);
        }
    }

    private void applyTimeZoneUpdate(EstablishmentConfig config, String timeZone) {
        if (timeZone == null) return;
        String tz = timeZone.trim();
        if (!tz.equalsIgnoreCase("SYSTEM") && !tz.isBlank()) {
            try {
                java.time.ZoneId.of(tz);
            } catch (Exception _) {
                throw new BusinessException("The specified time zone is invalid: " + tz);
            }
        }
        config.setTimeZone(tz.isBlank() ? "SYSTEM" : tz);
    }
}
