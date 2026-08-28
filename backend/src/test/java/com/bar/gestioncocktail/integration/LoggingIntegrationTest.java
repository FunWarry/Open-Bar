package com.bar.gestioncocktail.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.io.File;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test validating Logback file logging and Spring Boot context startup.
 */
@TestPropertySource(properties = {
        "logging.file.path=target/test-logs"
})
class LoggingIntegrationTest extends BaseIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(LoggingIntegrationTest.class);

    @Test
    @DisplayName("logbackSpring_createsLogFileAndWritesEventsInProductionProfile")
    void logbackSpring_createsLogFileAndWritesEvents() {
        String testMessage = "OPENBAR_LOGGING_INTEGRATION_TEST_EVENT_" + System.currentTimeMillis();
        log.info(testMessage);

        File logDir = new File("target/test-logs");
        assertThat(logDir).exists();

        File logFile = new File(logDir, "openbar-backend.log");
        assertThat(logFile).exists();

        org.awaitility.Awaitility.await()
                .atMost(java.time.Duration.ofSeconds(3))
                .untilAsserted(() -> {
                    String content = Files.readString(logFile.toPath());
                    assertThat(content).contains("OPENBAR_LOGGING_INTEGRATION_TEST_EVENT_");
                });
    }
}
