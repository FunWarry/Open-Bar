package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests validating automatic seeding behaviors in test environment
 * and setup endpoint responses.
 */
class EnvironmentProfileSeedingIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private GlasswareRepository glasswareRepository;

    @Test
    @DisplayName("Test profile auto-seeds full dataset on startup (99 cocktails, glassware, users, tables)")
    void testProfile_autoSeedsFullDatasetOnStartup() {
        assertThat(glasswareRepository.count()).isGreaterThanOrEqualTo(8);
        assertThat(cocktailRepository.count()).isGreaterThanOrEqualTo(90);
        assertThat(userRepository.count()).isGreaterThanOrEqualTo(5);
        assertThat(tableRepository.count()).isGreaterThanOrEqualTo(20);
    }

    @Test
    @DisplayName("GET /api/setup/status returns initialized=true when test users are present")
    void getSetupStatus_returnsInitializedTrueWhenUsersExist() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/setup/status")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialized").value(true))
                .andExpect(jsonPath("$.userCount").isNumber());
    }

    @Test
    @DisplayName("POST /api/setup/seed-demo triggers demo dataset generation successfully")
    void seedDemoData_executesSuccessfully() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/setup/seed-demo")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));
    }

    @Test
    @DisplayName("POST /api/setup/clean-test-data with ADMIN token purges test data successfully")
    void cleanTestData_withAdminToken_executesSuccessfully() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/setup/clean-test-data")
                        .header("Authorization", "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));
    }

    @Test
    @DisplayName("POST /api/setup/clean-test-data without token returns forbidden")
    void cleanTestData_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/setup/clean-test-data")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
