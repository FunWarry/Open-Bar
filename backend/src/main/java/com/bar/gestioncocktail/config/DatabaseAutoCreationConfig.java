package com.bar.gestioncocktail.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.io.File;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Configuration class that automatically ensures the PostgreSQL container is
 * running
 * and the target environment database exists before Spring Boot initializes the
 * DataSource.
 */
@Configuration(proxyBeanMethods = false)
public class DatabaseAutoCreationConfig {
    private static final Logger log = LoggerFactory.getLogger(DatabaseAutoCreationConfig.class);
    private static final String DEFAULT_POSTGRES = "postgres";
    private static final String CONTAINER_NAME = "gestion_cocktail_db";
    private static final Pattern DB_NAME_PATTERN = Pattern.compile("^\\w+$");
    private static final Pattern HOST_PORT_PATTERN = Pattern.compile("jdbc:postgresql://([^:/]+)(?::(\\d+))?/");

    DatabaseAutoCreationConfig() {
        // Package-private constructor for Spring / CGLIB instantiation
    }

    /**
     * Creates a BeanFactoryPostProcessor that inspects the datasource URL, starts
     * the PostgreSQL container
     * if stopped, waits for port readiness, and creates the target database if
     * missing.
     *
     * @param env Spring Environment instance containing configuration properties
     * @return BeanFactoryPostProcessor executing early database readiness check
     */
    @Bean
    public static BeanFactoryPostProcessor databaseAutoCreator(Environment env) {
        return beanFactory -> {
            String url = env.getProperty("spring.datasource.url");
            String username = env.getProperty("spring.datasource.username", DEFAULT_POSTGRES);
            String password = env.getProperty("spring.datasource.password", DEFAULT_POSTGRES);

            if (url == null || !url.startsWith("jdbc:postgresql:")) {
                return;
            }

            try {
                Optional<String> dbNameOpt = extractDatabaseName(url);
                if (dbNameOpt.isEmpty()) {
                    return;
                }

                String dbName = dbNameOpt.get();
                if (!DB_NAME_PATTERN.matcher(dbName).matches()) {
                    log.warn("Database name '{}' contains invalid characters. Skipping auto-creation check.", dbName);
                    return;
                }

                HostPort hostPort = parseHostPort(url);
                ensurePostgresContainerRunning(hostPort.host(), hostPort.port());

                int lastSlash = url.lastIndexOf('/');
                String postgresUrl = url.substring(0, lastSlash + 1) + DEFAULT_POSTGRES;

                waitForPostgresReady(postgresUrl, username, password, 20, 1000);
                ensureDatabaseExists(postgresUrl, dbName, username, password);
            } catch (Exception e) {
                log.warn("Database auto-creation check skipped or failed (non-blocking): {}", e.getMessage());
            }
        };
    }

    /**
     * Host and port container record.
     *
     * @param host Host name or IP
     * @param port Port number
     */
    private record HostPort(String host, int port) {
    }

    /**
     * Parses host and port from a PostgreSQL JDBC connection URL.
     *
     * @param url JDBC URL
     * @return HostPort containing parsed host and port (defaulting to
     *         localhost:5432)
     */
    private static HostPort parseHostPort(String url) {
        Matcher matcher = HOST_PORT_PATTERN.matcher(url);
        if (matcher.find()) {
            String host = matcher.group(1);
            String portStr = matcher.group(2);
            int port = portStr != null ? Integer.parseInt(portStr) : 5432;
            return new HostPort(host, port);
        }
        return new HostPort("localhost", 5432);
    }

    /**
     * Checks if PostgreSQL port is open, and if not, attempts to start the Docker
     * container / compose.
     *
     * @param host Host to test
     * @param port Port to test
     */
    private static void ensurePostgresContainerRunning(String host, int port) {
        if (isPortOpen(host, port, 1000)) {
            return;
        }

        log.info("PostgreSQL port {}:{} is not reachable. Attempting automatic Docker container startup...", host,
                port);

        if (!tryDockerStartContainer()) {
            tryDockerComposeUp();
        }
    }

    /**
     * Tests if a socket connection can be established to a host and port within
     * timeout.
     *
     * @param host      Target host
     * @param port      Target port
     * @param timeoutMs Timeout in milliseconds
     * @return true if port is reachable, false otherwise
     */
    private static boolean isPortOpen(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception _) {
            return false;
        }
    }

    private static final String WIN_DOCKER_BIN = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
    private static final String WIN_DOCKER_ALT = "C:\\Program Files\\Docker\\Docker\\resources\\docker.exe";

    /**
     * Resolves the path to the Docker executable.
     *
     * @return Absolute path to docker executable if available, or executable name
     */
    private static String getDockerExecutable() {
        String customDockerPath = System.getenv("DOCKER_PATH");
        if (customDockerPath != null && !customDockerPath.isBlank()) {
            File customFile = new File(customDockerPath);
            if (customFile.exists()) {
                return customFile.getAbsolutePath();
            }
        }

        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            File[] candidates = new File[] {
                    new File(WIN_DOCKER_BIN),
                    new File(WIN_DOCKER_ALT)
            };
            for (File candidate : candidates) {
                if (candidate.exists()) {
                    return candidate.getAbsolutePath();
                }
            }
        }
        return "docker";
    }

    /**
     * Attempts to start an existing Docker container using 'docker start'.
     *
     * @return true if process executed successfully, false otherwise
     */
    private static boolean tryDockerStartContainer() {
        try {
            Process process = new ProcessBuilder(getDockerExecutable(), "start", CONTAINER_NAME)
                    .redirectErrorStream(true)
                    .start();
            return process.waitFor() == 0;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Docker container start interrupted: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("Could not start Docker container: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Attempts to start the Docker container using 'docker compose up -d'.
     */
    private static void tryDockerComposeUp() {
        try {
            File composeFile = findDockerComposeFile();
            if (composeFile != null && composeFile.exists()) {
                ProcessBuilder pb = new ProcessBuilder(getDockerExecutable(), "compose", "-f",
                        composeFile.getAbsolutePath(), "up", "-d");
                pb.redirectErrorStream(true);
                Process process = pb.start();
                process.waitFor();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Docker compose execution interrupted: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("Failed to run docker compose: {}", e.getMessage());
        }
    }

    /**
     * Locates the docker-compose.yml file in standard workspace locations.
     *
     * @return File reference to docker-compose.yml, or null if not found
     */
    private static File findDockerComposeFile() {
        File[] candidates = new File[] {
                new File("src/main/resources/docker-compose.yml"),
                new File("backend/src/main/resources/docker-compose.yml"),
                new File("../src/main/resources/docker-compose.yml"),
                new File("docker-compose.yml")
        };
        for (File candidate : candidates) {
            if (candidate.exists()) {
                return candidate.getAbsoluteFile();
            }
        }
        return null;
    }

    /**
     * Waits for PostgreSQL service to be ready to accept JDBC connections by
     * polling connection attempts.
     *
     * @param postgresUrl Maintenance JDBC URL
     * @param username    Datasource username
     * @param password    Datasource password
     * @param maxRetries  Maximum number of attempts
     * @param delayMs     Delay between attempts in milliseconds
     */
    private static void waitForPostgresReady(String postgresUrl, String username, String password, int maxRetries,
            int delayMs) {
        for (int i = 0; i < maxRetries; i++) {
            try (Connection conn = obtainMaintenanceConnection(postgresUrl, username, password)) {
                if (conn != null && !conn.isClosed()) {
                    log.info("PostgreSQL service at '{}' is ready to accept connections.", postgresUrl);
                    return;
                }
            } catch (Exception _) {
                // Ignore transient connection errors during PostgreSQL container startup
            }
            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException _) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        log.warn("PostgreSQL service at '{}' did not accept connections after {} attempts.", postgresUrl, maxRetries);
    }

    /**
     * Extracts the target database name from a PostgreSQL JDBC connection URL.
     *
     * @param url PostgreSQL JDBC URL
     * @return Optional containing database name if present
     */
    private static Optional<String> extractDatabaseName(String url) {
        int lastSlash = url.lastIndexOf('/');
        if (lastSlash == -1) {
            return Optional.empty();
        }
        int paramQuestion = url.indexOf('?', lastSlash);
        String dbName = paramQuestion != -1 ? url.substring(lastSlash + 1, paramQuestion)
                : url.substring(lastSlash + 1);
        return dbName.isBlank() ? Optional.empty() : Optional.of(dbName);
    }

    /**
     * Ensures that the requested database exists on the PostgreSQL server, creating
     * it if missing.
     *
     * @param postgresUrl JDBC URL for the PostgreSQL maintenance database
     * @param dbName      Target database name to check/create
     * @param username    Datasource username
     * @param password    Datasource password
     */
    private static void ensureDatabaseExists(String postgresUrl, String dbName, String username, String password) {
        try (Connection conn = obtainMaintenanceConnection(postgresUrl, username, password)) {
            if (conn != null && !databaseExists(conn, dbName)) {
                log.info("Target database '{}' does not exist in PostgreSQL. Creating automatically...", dbName);
                createDatabase(conn, dbName);
                log.info("Successfully created database '{}'.", dbName);
            }
        } catch (SQLException e) {
            log.warn("Error during database existence check or creation: {}", e.getMessage());
        }
    }

    /**
     * Attempts to open a JDBC Connection to the PostgreSQL maintenance database.
     *
     * @param postgresUrl Maintenance JDBC URL
     * @param username    Primary configured username
     * @param password    Configured password
     * @return Opened Connection, or null if connection failed
     */
    private static Connection obtainMaintenanceConnection(String postgresUrl, String username, String password) {
        try {
            return DriverManager.getConnection(postgresUrl, username, password);
        } catch (SQLException e) {
            if (!DEFAULT_POSTGRES.equalsIgnoreCase(username)) {
                try {
                    return DriverManager.getConnection(postgresUrl, DEFAULT_POSTGRES, password);
                } catch (SQLException _) {
                    log.warn("Could not connect to PostgreSQL maintenance database using secondary fallback: {}",
                            e.getMessage());
                }
            } else {
                log.warn("Could not connect to PostgreSQL maintenance database: {}", e.getMessage());
            }
            return null;
        }
    }

    /**
     * Checks if a database with the specified name exists in PostgreSQL system
     * catalog.
     *
     * @param conn   Open maintenance connection
     * @param dbName Name of database to query
     * @return true if database exists, false otherwise
     * @throws SQLException if query execution fails
     */
    private static boolean databaseExists(Connection conn, String dbName) throws SQLException {
        try (PreparedStatement checkStmt = conn.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
            checkStmt.setString(1, dbName);
            try (ResultSet rs = checkStmt.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static final Set<String> ALLOWED_DB_NAMES = Set.of(
            "gestion_cocktail",
            "gestion_cocktail_dev",
            "gestion_cocktail_test",
            "openbar"
    );

    /**
     * Creates a new PostgreSQL database with the specified validated name.
     *
     * @param conn   Open maintenance connection
     * @param dbName Validated database name
     * @throws SQLException if database creation DDL fails
     */
    private static void createDatabase(Connection conn, String dbName) throws SQLException {
        String safeName = null;
        for (String allowed : ALLOWED_DB_NAMES) {
            if (allowed.equalsIgnoreCase(dbName)) {
                safeName = allowed;
                break;
            }
        }
        if (safeName == null) {
            throw new IllegalArgumentException("Unauthorized database name: " + dbName);
        }
        try (Statement stmt = conn.createStatement()) {
            switch (safeName) {
                case "gestion_cocktail_dev" -> stmt.executeUpdate("CREATE DATABASE gestion_cocktail_dev");
                case "gestion_cocktail_test" -> stmt.executeUpdate("CREATE DATABASE gestion_cocktail_test");
                case "openbar" -> stmt.executeUpdate("CREATE DATABASE openbar");
                default -> stmt.executeUpdate("CREATE DATABASE gestion_cocktail");
            }
        }
    }
}
