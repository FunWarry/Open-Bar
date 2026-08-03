package com.bar.gestioncocktail.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Configuration class that automatically ensures the target PostgreSQL database exists
 * before Spring Boot initializes the DataSource connection pool.
 */
@Configuration
public class DatabaseAutoCreationConfig {
    private static final Logger log = LoggerFactory.getLogger(DatabaseAutoCreationConfig.class);

    /**
     * Creates a BeanFactoryPostProcessor that inspects the datasource URL and creates
     * the requested database if missing on the PostgreSQL server instance.
     *
     * @param env Spring Environment instance containing configuration properties
     * @return BeanFactoryPostProcessor executing early database existence check
     */
    @Bean
    public static BeanFactoryPostProcessor databaseAutoCreator(Environment env) {
        return beanFactory -> {
            String url = env.getProperty("spring.datasource.url");
            String username = env.getProperty("spring.datasource.username", "postgres");
            String password = env.getProperty("spring.datasource.password", "postgres");

            if (url == null || !url.contains("postgresql")) {
                return;
            }

            try {
                int lastSlash = url.lastIndexOf('/');
                if (lastSlash == -1) return;

                int paramQuestion = url.indexOf('?', lastSlash);
                String dbName = paramQuestion != -1 ? url.substring(lastSlash + 1, paramQuestion) : url.substring(lastSlash + 1);
                String postgresUrl = url.substring(0, lastSlash + 1) + "postgres";

                try (Connection conn = DriverManager.getConnection(postgresUrl, username, password);
                     Statement stmt = conn.createStatement()) {

                    ResultSet rs = stmt.executeQuery("SELECT 1 FROM pg_database WHERE datname = '" + dbName + "'");
                    if (!rs.next()) {
                        log.info("Target database '{}' does not exist in PostgreSQL. Creating automatically...", dbName);
                        stmt.executeUpdate("CREATE DATABASE " + dbName);
                        log.info("Successfully created database '{}'.", dbName);
                    }
                }
            } catch (Exception e) {
                log.warn("Database auto-creation check skipped or failed (non-blocking): {}", e.getMessage());
            }
        };
    }
}
