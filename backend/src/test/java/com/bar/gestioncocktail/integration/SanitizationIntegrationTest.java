package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.IngredientRequestDTO;
import com.bar.gestioncocktail.dto.TableRequestDTO;
import com.bar.gestioncocktail.model.CocktailCategorie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end integration tests verifying automated input sanitization and XSS protection across REST endpoints.
 */
class SanitizationIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("objectMapper - directly sanitizes record fields on readValue")
    void testObjectMapperSanitization() throws Exception {
        String json = "{\"nom\": \"<script>alert('xss')</script>Spicy Mezcal\"}";
        CocktailRequestDTO dto = objectMapper.readValue(json, CocktailRequestDTO.class);
        assertThat(dto.nom()).isEqualTo("Spicy Mezcal");
    }

    @Test
    @DisplayName("createCocktail - automatically strips XSS tags from name, description, and instructions")
    void createCocktail_withXssPayload_sanitizesFields() throws Exception {
        CocktailRequestDTO request = new CocktailRequestDTO(
                "<script>alert('xss')</script>Spicy Mezcal",
                "<img src=x onerror=alert(1)>Smoky and spicy",
                BigDecimal.valueOf(14.50),
                CocktailCategorie.ALCOOLISE,
                true,
                false,
                null,
                null,
                null,
                null,
                "<iframe src='evil.com'></iframe>Shake with ice and strain.",
                null,
                List.of(),
                null,
                List.of()
        );

        mockMvc.perform(post("/api/cocktails")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Spicy Mezcal"))
                .andExpect(jsonPath("$.description").value("Smoky and spicy"))
                .andExpect(jsonPath("$.instructions").value("Shake with ice and strain."));
    }

    @Test
    @DisplayName("createIngredient - automatically strips XSS tags from supplier and notes")
    void createIngredient_withXssPayload_sanitizesFields() throws Exception {
        IngredientRequestDTO request = new IngredientRequestDTO(
                "Organic Mint",
                "g",
                BigDecimal.valueOf(500.0),
                BigDecimal.valueOf(50.0),
                "LOT-2026-XSS",
                null,
                BigDecimal.valueOf(0.05),
                "<script>alert('bad')</script>Local Farm",
                "<a href=\"javascript:alert('pwn')\">Fresh organic mint leaves</a>"
        );

        mockMvc.perform(post("/api/ingredients")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Organic Mint"))
                .andExpect(jsonPath("$.fournisseur").value("Local Farm"))
                .andExpect(jsonPath("$.notes").value("Fresh organic mint leaves"));
    }

    @Test
    @DisplayName("createTable - automatically strips XSS tags from zone name")
    void createTable_withXssZone_sanitizesZoneName() throws Exception {
        TableRequestDTO request = new TableRequestDTO(
                99,
                4,
                "<script>alert(1)</script>Terrasse VIP",
                100.0,
                100.0,
                0.0,
                "CARRE"
        );

        mockMvc.perform(post("/api/tables")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.zone").value("Terrasse VIP"));
    }

    @Test
    @DisplayName("createOrder - automatically strips XSS tags from waiter order notes")
    void createOrder_withXssNotes_sanitizesNotes() throws Exception {
        CommandeRequestDTO request = new CommandeRequestDTO(
                1L,
                null,
                "<script>alert('hack')</script>Customer requested no sugar",
                BigDecimal.ZERO
        );

        mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes").value("Customer requested no sugar"));
    }
}
