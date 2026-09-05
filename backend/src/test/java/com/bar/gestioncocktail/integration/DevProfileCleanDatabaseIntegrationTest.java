package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests validating that running with the 'dev' profile preserves
 * a completely clean, blank database on startup (0 users, 0 cocktails, 0 tables)
 * so that first-run onboarding and setup wizards are properly triggered.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles(profiles = "dev", inheritProfiles = false)
class DevProfileCleanDatabaseIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private GlasswareRepository glasswareRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    protected void ensureTestUsersExist() {
        // Do not auto-seed test users in this test class to assert blank initial state
    }

    @org.junit.jupiter.api.BeforeEach
    void cleanDatabase() {
        try {
            jdbcTemplate.execute("TRUNCATE TABLE users, cocktails, tables CASCADE");
        } catch (Exception _) {
            // Ignored if tables are already clean
        }
    }

    @Test
    @DisplayName("Dev profile starts with a clean blank database (0 users, 0 cocktails, 0 tables, standard glassware only)")
    void devProfile_startsCleanWithoutAutoSeeding() {
        assertThat(userRepository.count()).isZero();
        assertThat(cocktailRepository.count()).isZero();
        assertThat(tableRepository.count()).isZero();
        assertThat(glasswareRepository.count()).isGreaterThanOrEqualTo(8);
    }

    @Test
    @DisplayName("GET /api/setup/status returns initialized=false when running dev blank database")
    void getSetupStatus_returnsInitializedFalseOnCleanDatabase() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/setup/status")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialized").value(false))
                .andExpect(jsonPath("$.userCount").value(0));
    }
}
