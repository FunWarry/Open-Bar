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
     * Safely executes ADD COLUMN IF NOT EXISTS statements for entity properties.
     */
    public void migrateLegacyColumns() {
        if (jdbcTemplate == null) {
            return;
        }

        try {
            log.info("Checking and applying schema column migrations for development database...");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6c7fe8'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS primary_color_strong VARCHAR(7) DEFAULT '#5a68d6'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(2048)");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS establishment_name VARCHAR(100) DEFAULT 'OpenBar'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_theme VARCHAR(20) DEFAULT 'DARK'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'EUR'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '€'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS currency_position VARCHAR(10) DEFAULT 'AFTER'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS temps_alerte_warning_minutes INTEGER DEFAULT 3");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS temps_alerte_commande_minutes INTEGER DEFAULT 5");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS temps_alerte_critique_commande_minutes INTEGER DEFAULT 10");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS client_base_url VARCHAR(500) DEFAULT 'https://openbar.lan'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_ssid VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_security VARCHAR(20) DEFAULT 'WPA'");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS wifi_enabled BOOLEAN DEFAULT false");
            jdbcTemplate.execute("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            jdbcTemplate.execute("ALTER TABLE establishment_config ADD COLUMN IF NOT EXISTS ticket_format VARCHAR(10) DEFAULT '80mm'");
            jdbcTemplate.execute("ALTER TABLE commandes ADD COLUMN IF NOT EXISTS prioritaire BOOLEAN DEFAULT false");
            log.info("Schema column migrations completed successfully.");
        } catch (Exception e) {
            log.warn("Schema migration notice: {}", e.getMessage());
        }
    }
}
