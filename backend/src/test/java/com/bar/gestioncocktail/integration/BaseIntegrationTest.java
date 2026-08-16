package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

/**
 * Shared base class for Spring Boot full-stack integration tests backed by Testcontainers PostgreSQL.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Container
    @ServiceConnection
    protected static final PostgreSQLContainer<?> postgres = createPostgresContainer();

    private static PostgreSQLContainer<?> createPostgresContainer() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:15-alpine");
        container.withDatabaseName("gestion_cocktail_test");
        container.withUsername("postgres");
        container.withPassword("postgres");
        return container;
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (postgres.isRunning()) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
        registry.add("JWT_SECRET", () -> "test_openbar_default_secret_key_minimum_32_chars_long");
    }

    @Autowired
    protected WebApplicationContext webApplicationContext;

    protected ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    protected MockMvc mockMvc;

    @BeforeEach
    void setUpMockMvc() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    /**
     * Generates a signed JWT token for the admin user.
     *
     * @return Bearer token
     */
    protected String getAdminToken() {
        return jwtTokenProvider.generateToken("admin");
    }

    /**
     * Generates a signed JWT token for the manager user.
     *
     * @return Bearer token
     */
    protected String getManagerToken() {
        return jwtTokenProvider.generateToken("manager");
    }

    /**
     * Generates a signed JWT token for the server user (serveur1).
     *
     * @return Bearer token
     */
    protected String getServeurToken() {
        return jwtTokenProvider.generateToken("serveur1");
    }

    /**
     * Generates a signed JWT token for the bartender user (barman1).
     *
     * @return Bearer token
     */
    protected String getBarmanToken() {
        return jwtTokenProvider.generateToken("barman1");
    }
}
