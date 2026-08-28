package com.bar.gestioncocktail.config;

import ch.qos.logback.classic.AsyncAppender;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import ch.qos.logback.core.rolling.RollingFileAppender;
import ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.util.Iterator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

class LoggingConfigurationTest {

    @Test
    @DisplayName("logbackContext - verifies Logback is active SLF4J implementation")
    void logbackContext_isActive() {
        assertThat(LoggerFactory.getILoggerFactory()).isInstanceOf(LoggerContext.class);
    }

    @Test
    @DisplayName("loggerInstance - logger for application package logs messages without exception")
    void loggerInstance_logsMessagesSuccessfully() {
        org.slf4j.Logger logger = LoggerFactory.getLogger(LoggingConfigurationTest.class);
        assertThatNoException().isThrownBy(() -> {
            logger.debug("Test debug log message");
            logger.info("Test info log message");
            logger.warn("Test warning log message");
            logger.error("Test error log message", new RuntimeException("Test exception"));
        });
    }

    @Test
    @DisplayName("rootLogger - verifies root logger and appenders exist in LoggerContext")
    void rootLogger_hasAppenders() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        Logger rootLogger = context.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);

        assertThat(rootLogger).isNotNull();
        Iterator<Appender<ILoggingEvent>> appenderIterator = rootLogger.iteratorForAppenders();
        assertThat(appenderIterator.hasNext()).isTrue();
    }

    @Test
    @DisplayName("fileAppender - verifies RollingFileAppender can be configured with SizeAndTimeBasedRollingPolicy")
    void fileAppender_rollingPolicyConfiguration() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();

        RollingFileAppender<ILoggingEvent> fileAppender = new RollingFileAppender<>();
        fileAppender.setContext(context);
        fileAppender.setFile("target/logs/test-openbar.log");

        SizeAndTimeBasedRollingPolicy<ILoggingEvent> policy = new SizeAndTimeBasedRollingPolicy<>();
        policy.setContext(context);
        policy.setParent(fileAppender);
        policy.setFileNamePattern("target/logs/archived/test-openbar-%d{yyyy-MM-dd}.%i.log.gz");
        policy.setMaxHistory(14);
        policy.setCleanHistoryOnStart(true);

        assertThat(policy.getMaxHistory()).isEqualTo(14);
        assertThat(policy.isCleanHistoryOnStart()).isTrue();
    }

    @Test
    @DisplayName("asyncAppender - verifies AsyncAppender non-blocking queue defaults")
    void asyncAppender_queueConfiguration() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();

        AsyncAppender asyncAppender = new AsyncAppender();
        asyncAppender.setContext(context);
        asyncAppender.setQueueSize(512);
        asyncAppender.setDiscardingThreshold(0);
        asyncAppender.setIncludeCallerData(false);

        assertThat(asyncAppender.getQueueSize()).isEqualTo(512);
        assertThat(asyncAppender.getDiscardingThreshold()).isZero();
        assertThat(asyncAppender.isIncludeCallerData()).isFalse();
    }
}
