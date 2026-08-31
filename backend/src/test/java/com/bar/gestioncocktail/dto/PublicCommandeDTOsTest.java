package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.DefaultTheme;
import com.bar.gestioncocktail.model.TableEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PublicCommandeDTOsTest {

    @Test
    @DisplayName("PublicCommandeRequestDTO - getters and setters")
    void publicCommandeRequestDTO_gettersSetters() {
        PublicCommandeItemRequestDTO itemDto = new PublicCommandeItemRequestDTO(1L, 2L, 2, "Sans glacons");
        PublicCommandeRequestDTO request = new PublicCommandeRequestDTO(10L, List.of(itemDto), "Urgent");

        assertThat(request.getTableId()).isEqualTo(10L);
        assertThat(request.getNotes()).isEqualTo("Urgent");
        assertThat(request.getItems()).hasSize(1);
        assertThat(request.getItems().get(0).getCocktailId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("PublicCommandeRequestDTO - no args constructor")
    void publicCommandeRequestDTO_noArgs() {
        PublicCommandeRequestDTO request = new PublicCommandeRequestDTO();
        request.setTableId(5L);
        request.setNotes("No ice");

        assertThat(request.getTableId()).isEqualTo(5L);
        assertThat(request.getNotes()).isEqualTo("No ice");
    }

    @Test
    @DisplayName("PublicCommandeResponseDTO.from - maps Commande entity")
    void publicCommandeResponseDTO_from() {
        TableEntity table = new TableEntity();
        table.setId(1L);
        table.setNumero(12);

        Commande commande = new Commande();
        commande.setId(100L);
        commande.setTable(table);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setTrackingToken("TOKEN-123");
        commande.setItems(List.of());

        PublicCommandeResponseDTO response = PublicCommandeResponseDTO.from(commande, 15);

        assertThat(response).isNotNull();
        assertThat(response.getCommandeId()).isEqualTo(100L);
        assertThat(response.getTableNumero()).isEqualTo("12");
        assertThat(response.getTrackingToken()).isEqualTo("TOKEN-123");
        assertThat(response.getTempsEstimeMinutes()).isEqualTo(15);
    }

    @Test
    @DisplayName("CreateAdminRequestDTO - record fields")
    void createAdminRequestDTO() {
        CreateAdminRequestDTO dto = new CreateAdminRequestDTO("admin", "admin@bar.com", "pass", "Admin", "Super");
        assertThat(dto.username()).isEqualTo("admin");
        assertThat(dto.email()).isEqualTo("admin@bar.com");
    }

    @Test
    @DisplayName("MergeFacturesRequestDTO - record fields")
    void mergeFacturesRequestDTO() {
        MergeFacturesRequestDTO dto = new MergeFacturesRequestDTO(List.of(1L, 2L), 5L);
        assertThat(dto.factureIds()).containsExactly(1L, 2L);
        assertThat(dto.targetTableId()).isEqualTo(5L);
    }

    @Test
    @DisplayName("AppSettingsUpdateRequest - record fields")
    void appSettingsUpdateRequest() {
        AppSettingsUpdateRequest dto = new AppSettingsUpdateRequest("#3880ff", "#3171e0", "https://bar.com/logo.png", "OpenBar", DefaultTheme.DARK, "EUR", "€", com.bar.gestioncocktail.model.CurrencyPosition.AFTER, 3, 5, 10, "https://openbar.lan", "OpenBar-WiFi", "secret", "WPA", true);
        assertThat(dto.establishmentName()).isEqualTo("OpenBar");
        assertThat(dto.primaryColor()).isEqualTo("#3880ff");
        assertThat(dto.currencyCode()).isEqualTo("EUR");
        assertThat(dto.currencySymbol()).isEqualTo("€");
        assertThat(dto.currencyPosition()).isEqualTo(com.bar.gestioncocktail.model.CurrencyPosition.AFTER);
        assertThat(dto.tempsAlerteWarningMinutes()).isEqualTo(3);
        assertThat(dto.tempsAlerteCommandeMinutes()).isEqualTo(5);
        assertThat(dto.tempsAlerteCritiqueCommandeMinutes()).isEqualTo(10);
        assertThat(dto.clientBaseUrl()).isEqualTo("https://openbar.lan");
        assertThat(dto.wifiSsid()).isEqualTo("OpenBar-WiFi");
        assertThat(dto.wifiPassword()).isEqualTo("secret");
        assertThat(dto.wifiSecurity()).isEqualTo("WPA");
        assertThat(dto.wifiEnabled()).isTrue();
    }

    @Test
    @DisplayName("LoginRequest and LoginResponse - POJOs")
    void loginDTOs() {
        LoginRequest req = new LoginRequest();
        req.setUsername("user");
        req.setPassword("pass");
        assertThat(req.getUsername()).isEqualTo("user");

        LocalDateTime now = LocalDateTime.now();
        LoginResponse res = new LoginResponse("token", "refresh", "user", List.of("ADMIN"), "user@bar.com", now, now);
        assertThat(res.getToken()).isEqualTo("token");
        assertThat(res.getUsername()).isEqualTo("user");
    }
}
