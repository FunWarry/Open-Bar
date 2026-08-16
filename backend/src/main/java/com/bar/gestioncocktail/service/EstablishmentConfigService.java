package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import com.bar.gestioncocktail.util.SiretLuhnValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing legal establishment configuration parameters.
 */
@Service
public class EstablishmentConfigService {

    private final EstablishmentConfigRepository establishmentConfigRepository;

    public EstablishmentConfigService(EstablishmentConfigRepository establishmentConfigRepository) {
        this.establishmentConfigRepository = establishmentConfigRepository;
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
        return establishmentConfigRepository.findById(EstablishmentConfig.SINGLETON_ID)
            .orElseGet(() -> {
                EstablishmentConfig config = new EstablishmentConfig();
                config.setId(EstablishmentConfig.SINGLETON_ID);
                return config;
            });
    }

    /**
     * Retrieves current establishment configuration as a DTO.
     *
     * @return {@link EstablishmentConfigDTO}
     */
    @Transactional(readOnly = true)
    public EstablishmentConfigDTO getConfigDTO() {
        return EstablishmentConfigDTO.from(getConfigInternal());
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
        return EstablishmentConfigDTO.from(saved);
    }

    private void applyUpdates(EstablishmentConfig config, EstablishmentConfigUpdateRequest request) {
        applyLegalInfoUpdates(config, request);
        applyContactAndPolicyUpdates(config, request);
        applyTimeZoneUpdate(config, request.timeZone());
        applyTicketFormatUpdate(config, request.ticketFormat());
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
