package com.bar.gestioncocktail.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Automatic schema migration service that ensures all newly added entity columns
 * are dynamically available on existing local database instances without manual migrations.
 */
@Service
@Profile({"dev", "test"})
@Order(-100)
public class DatabaseSchemaMigrationService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaMigrationService.class);

    private final JdbcTemplate jdbcTemplate;

    /**
     * Constructs the migration service with the primary JDBC template.
     *
     * @param jdbcTemplate Spring JDBC template
     */
    public DatabaseSchemaMigrationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrateLegacyColumns();
    }

    /**
     * Ensures required baseline tables exist in the development database.
     */
    public void migrateLegacyColumns() {
        if (jdbcTemplate == null) {
            return;
        }

        try {
            log.info("Checking baseline schema tables for development database...");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS table_cart_items (
                    id BIGSERIAL PRIMARY KEY,
                    table_id BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
                    guest_session_id VARCHAR(64) NOT NULL,
                    guest_name VARCHAR(100) NOT NULL,
                    cocktail_id BIGINT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
                    cocktail_variante_id BIGINT REFERENCES cocktail_variantes(id) ON DELETE SET NULL,
                    quantite INTEGER NOT NULL DEFAULT 1 CHECK (quantite > 0),
                    notes VARCHAR(500),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS happy_hour_rules (
                    id BIGSERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    discount_type VARCHAR(30) NOT NULL,
                    discount_value DECIMAL(10,2) NOT NULL,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS happy_hour_days (
                    rule_id BIGINT NOT NULL REFERENCES happy_hour_rules(id) ON DELETE CASCADE,
                    day_of_week VARCHAR(20) NOT NULL,
                    PRIMARY KEY (rule_id, day_of_week)
                )
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS happy_hour_categories (
                    rule_id BIGINT NOT NULL REFERENCES happy_hour_rules(id) ON DELETE CASCADE,
                    category VARCHAR(50) NOT NULL,
                    PRIMARY KEY (rule_id, category)
                )
            """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS happy_hour_cocktails (
                    rule_id BIGINT NOT NULL REFERENCES happy_hour_rules(id) ON DELETE CASCADE,
                    cocktail_id BIGINT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
                    PRIMARY KEY (rule_id, cocktail_id)
                )
            """);
            log.info("Schema column migrations completed successfully.");
        } catch (Exception e) {
            log.warn("Schema migration notice: {}", e.getMessage());
        }
    }
}
