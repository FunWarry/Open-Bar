package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO de requête pour le passage d'une commande publique via QR Code client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Requête de prise de commande anonyme via scan QR code")
public class PublicCommandeRequestDTO {

    /**
     * Identifiant de la table scannée par le client.
     */
    @NotNull(message = "La table est obligatoire")
    @Schema(description = "ID de la table scannée", example = "5")
    private Long tableId;

    /**
     * Liste des cocktails et variantes commandés.
     */
    @NotEmpty(message = "La liste des articles ne peut pas être vide")
    @Valid
    @Schema(description = "Liste des articles commandés")
    private List<PublicCommandeItemRequestDTO> items;

    /**
     * Remarques éventuelles du client (ex: "Sans glaçons").
     */
    @Schema(description = "Consignes spécifiques du client", example = "Sans glaçons")
    private String notes;
}
