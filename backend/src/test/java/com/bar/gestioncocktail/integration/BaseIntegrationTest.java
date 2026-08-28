package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.Set;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

/**
 * Shared base class for Spring Boot full-stack integration tests backed by Testcontainers PostgreSQL.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    protected static final PostgreSQLContainer<?> postgres = createPostgresContainer();

    private static PostgreSQLContainer<?> createPostgresContainer() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:15-alpine");
        container.withDatabaseName("gestion_cocktail_test");
        container.withUsername("postgres");
        container.withPassword("postgres");
        return container;
    }

    static {
        try {
            postgres.start();
        } catch (Exception _) {
            // Optional start if DB is pre-provisioned in test environment
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (postgres.isRunning()) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        } else {
            String ciUrl = System.getenv("SPRING_DATASOURCE_URL");
            if (ciUrl != null) {
                registry.add("spring.datasource.url", () -> ciUrl);
                registry.add("spring.datasource.username", () -> System.getenv("SPRING_DATASOURCE_USERNAME"));
                registry.add("spring.datasource.password", () -> System.getenv("SPRING_DATASOURCE_PASSWORD"));
            }
        }
        registry.add("spring.security.jwt.secret", () -> "test_openbar_default_secret_key_minimum_32_chars_long");
        registry.add("spring.security.jwt.expiration", () -> "86400000");
        registry.add("JWT_SECRET", () -> "test_openbar_default_secret_key_minimum_32_chars_long");
    }

    @Autowired
    protected WebApplicationContext webApplicationContext;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected MockMvc mockMvc;

    @BeforeEach
    void setUpMockMvc() {
        this.mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .alwaysDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .build();
        ensureTestUsersExist();
    }

    private void ensureTestUsersExist() {
        createTestUserIfNotExists("admin", UserRole.ADMIN, UserRole.MANAGER);
        createTestUserIfNotExists("manager", UserRole.MANAGER);
        createTestUserIfNotExists("serveur1", UserRole.SERVEUR);
        createTestUserIfNotExists("barman1", UserRole.BARMAN);
    }

    private void createTestUserIfNotExists(String username, UserRole... roles) {
        if (userRepository.findByUsername(username).isEmpty()) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(username + "123"));
            user.setEmail(username + "@openbar.fr");
            user.setRoles(Set.of(roles));
            userRepository.save(user);
        }
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
