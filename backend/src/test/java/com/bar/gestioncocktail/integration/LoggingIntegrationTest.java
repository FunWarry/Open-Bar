package com.bar.gestioncocktail.integration;

import ch.qos.logback.classic.LoggerContext;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.context.TestPropertySource;

import java.io.File;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test validating Logback file logging and Spring Boot context startup.
 */
@Slf4j
@TestPropertySource(properties = {
        "logging.file.path=target/test-logs"
})
class LoggingIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("logbackSpring_createsLogFileAndWritesEventsInProductionProfile")
    void logbackSpring_createsLogFileAndWritesEvents() {
        String testMessage = "OPENBAR_LOGGING_INTEGRATION_TEST_EVENT_" + System.currentTimeMillis();
        log.info(testMessage);

        LoggerContext loggerContext = (LoggerContext) LoggerFactory.getILoggerFactory();
        String activeLogPath = loggerContext.getProperty("LOG_PATH");
        assertThat(activeLogPath).isNotBlank();

        File logDir = new File(activeLogPath);
        File logFile = new File(logDir, "openbar-backend.log");

        org.awaitility.Awaitility.await()
                .atMost(java.time.Duration.ofSeconds(3))
                .untilAsserted(() -> {
                    assertThat(logDir).exists();
                    assertThat(logFile).exists();
                    String content = Files.readString(logFile.toPath());
                    assertThat(content).contains(testMessage);
                });
    }
}
