package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.EstablishmentConfig;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Output DTO representing legal establishment configuration settings.
 */
public record EstablishmentConfigDTO(
    Long id,
    String legalName,
    String legalForm,
    String siret,
    String rcsCity,
    String rcsNumber,
    String tvaNumber,
    String codeApe,
    BigDecimal capitalSocial,
    String address,
    String phone,
    String email,
    String paymentTerms,
    String discountPolicy,
    BigDecimal latePaymentRate,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Maps an {@link EstablishmentConfig} entity to its DTO.
     *
     * @param config the entity to map
     * @return mapped DTO or null if input is null
     */
    public static EstablishmentConfigDTO from(EstablishmentConfig config) {
        if (config == null) {
            return null;
        }
        return new EstablishmentConfigDTO(
            config.getId(),
            config.getLegalName(),
            config.getLegalForm(),
            config.getSiret(),
            config.getRcsCity(),
            config.getRcsNumber(),
            config.getTvaNumber(),
            config.getCodeApe(),
            config.getCapitalSocial(),
            config.getAddress(),
            config.getPhone(),
            config.getEmail(),
            config.getPaymentTerms(),
            config.getDiscountPolicy(),
            config.getLatePaymentRate(),
            config.getCreatedAt(),
            config.getUpdatedAt()
        );
    }
}
