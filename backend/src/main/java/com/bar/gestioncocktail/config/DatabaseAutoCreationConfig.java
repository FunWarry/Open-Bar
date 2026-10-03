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

    private static final String PROP_USER = "user";
    private static final String PROP_PASSWORD = "password";
    private static final String PROP_CONNECT_TIMEOUT = "connectTimeout";
    private static final String PROP_SOCKET_TIMEOUT = "socketTimeout";
    private static final String PROP_LOGIN_TIMEOUT = "loginTimeout";

    DatabaseAutoCreationConfig() {
        // Package-private constructor for Spring / CGLIB instantiation
    }

    /**
     * Database connectivity and existence status.
     */
    enum DbStatus {
        /** Server is reachable and target database exists and accepts queries. */
        READY,
        /** Server is reachable, but the target database does not exist yet. */
        SERVER_UP_NO_DB,
        /** Database server is not reachable (Docker stopped/paused, port closed, or read timeout). */
        UNREACHABLE
    }

    /**
     * Result of probing database connectivity and responsiveness.
     *
     * @param status Resolved {@link DbStatus}
     * @param errorMessage Detailed error message if connectivity check failed
     */
    record ProbeResult(DbStatus status, String errorMessage) {
    }

    /**
     * Database connection target parameters.
     *
     * @param url Target JDBC URL
     * @param dbName Target database name
     * @param username Datasource username
     * @param password Datasource password
     */
    record DatabaseTarget(String url, String dbName, String username, String password) {
    }

    /**
     * Configuration options for database availability polling and reporting.
     *
     * @param pollIntervalSeconds Interval between connectivity checks in seconds
     * @param maxWaitSeconds Maximum wait time in seconds (0 = unlimited)
     */
    record WaitConfig(int pollIntervalSeconds, int maxWaitSeconds) {
    }

    /**
     * Creates a BeanFactoryPostProcessor that inspects the datasource URL, waits for
     * PostgreSQL / Docker availability if unreachable, and creates the target database if
     * missing.
     *
     * @param env Spring Environment instance containing configuration properties
     * @return BeanFactoryPostProcessor executing early database readiness check
     */
    @Bean
    public static BeanFactoryPostProcessor databaseAutoCreator(Environment env) {
        return beanFactory -> executeDatabaseAutoCreation(env);
    }

    /**
     * Executes the early database check, wait loop, and auto-creation.
     *
     * @param env Spring Environment instance containing configuration properties
     */
    private static void executeDatabaseAutoCreation(Environment env) {
        String url = env.getProperty("spring.datasource.url");
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

            String username = env.getProperty("spring.datasource.username", DEFAULT_POSTGRES);
            String password = env.getProperty("spring.datasource.password", DEFAULT_POSTGRES);
            DatabaseTarget target = new DatabaseTarget(url, dbName, username, password);

            String postgresUrl = buildMaintenanceUrl(url);
            DbStatus status = determineDatabaseStatus(env, target);

            if (status == DbStatus.SERVER_UP_NO_DB) {
                ensureDatabaseExists(postgresUrl, dbName, username, password);
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Database auto-creation check encountered an issue: {}", e.getMessage());
        }
    }

    /**
     * Constructs the maintenance JDBC URL (connecting to default 'postgres' database).
     *
     * @param url Original JDBC connection URL
     * @return Maintenance JDBC URL
     */
    private static String buildMaintenanceUrl(String url) {
        int lastSlash = url.lastIndexOf('/');
        int paramQuestion = url.indexOf('?', lastSlash);
        String params = paramQuestion != -1 ? url.substring(paramQuestion) : "";
        return url.substring(0, lastSlash + 1) + DEFAULT_POSTGRES + params;
    }

    /**
     * Determines database status, applying the retry wait loop if enabled.
     *
     * @param env Spring Environment instance
     * @param target Database target parameters
     * @return Determined {@link DbStatus}
     */
    private static DbStatus determineDatabaseStatus(Environment env, DatabaseTarget target) {
        boolean waitForConnection = Boolean.TRUE.equals(
                env.getProperty("openbar.database.wait-for-connection", Boolean.class, false));
        if (!waitForConnection) {
            return probeDatabaseStatus(target.url(), target.username(), target.password()).status();
        }

        int pollInterval = Optional.ofNullable(
                env.getProperty("openbar.database.poll-interval-seconds", Integer.class)).orElse(5);
        int maxWait = Optional.ofNullable(
                env.getProperty("openbar.database.max-wait-seconds", Integer.class)).orElse(900);
        WaitConfig waitConfig = new WaitConfig(pollInterval, maxWait);

        return waitForDatabaseReadyWithRetryLoop(target, waitConfig);
    }

    /**
     * Builds JDBC connection properties with custom credentials and timeouts.
     *
     * @param username Datasource username
     * @param password Datasource password
     * @param timeoutSeconds Connect and socket timeout in seconds
     * @return Configured {@link java.util.Properties}
     */
    private static java.util.Properties buildConnectionProperties(String username, String password, String timeoutSeconds) {
        java.util.Properties props = new java.util.Properties();
        props.setProperty(PROP_USER, username != null ? username : DEFAULT_POSTGRES);
        props.setProperty(PROP_PASSWORD, password != null ? password : "");
        props.setProperty(PROP_CONNECT_TIMEOUT, timeoutSeconds);
        props.setProperty(PROP_SOCKET_TIMEOUT, timeoutSeconds);
        props.setProperty(PROP_LOGIN_TIMEOUT, timeoutSeconds);
        return props;
    }

    /**
     * Probes PostgreSQL responsiveness and target database existence with short timeouts.
     *
     * @param targetUrl Target JDBC URL
     * @param username Datasource username
     * @param password Datasource password
     * @return {@link ProbeResult} containing connection status and any detailed error message
     */
    static ProbeResult probeDatabaseStatus(String targetUrl, String username, String password) {
        java.util.Properties props = buildConnectionProperties(username, password, "2");

        try (Connection conn = DriverManager.getConnection(targetUrl, props);
             Statement stmt = conn.createStatement()) {
            stmt.setQueryTimeout(2);
            try (ResultSet rs = stmt.executeQuery("SELECT 1")) {
                if (rs.next()) {
                    return new ProbeResult(DbStatus.READY, null);
                }
            }
        } catch (SQLException e) {
            String sqlState = e.getSQLState();
            String message = e.getMessage() != null ? e.getMessage().trim() : "";
            // SQLState 3D000: database does not exist in PostgreSQL
            if ("3D000".equals(sqlState) || message.toLowerCase().contains("does not exist") || message.toLowerCase().contains("n'existe pas")) {
                return new ProbeResult(DbStatus.SERVER_UP_NO_DB, message);
            }
            return new ProbeResult(DbStatus.UNREACHABLE, message.isBlank() ? e.getClass().getSimpleName() : message);
        } catch (Exception e) {
            String msg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage().trim() : e.getClass().getSimpleName();
            return new ProbeResult(DbStatus.UNREACHABLE, msg);
        }
        return new ProbeResult(DbStatus.UNREACHABLE, "No result from database query");
    }

    /**
     * Waits for PostgreSQL to become reachable, logging actionable diagnostic messages and retrying.
     *
     * @param target Target database parameters
     * @param waitConfig Polling and retry configuration
     * @return Final {@link DbStatus} (READY or SERVER_UP_NO_DB)
     */
    private static DbStatus waitForDatabaseReadyWithRetryLoop(
            DatabaseTarget target,
            WaitConfig waitConfig) {

        HostPort hostPort = parseHostPort(target.url());
        ProbeResult probe = probeDatabaseStatus(target.url(), target.username(), target.password());
        if (probe.status() != DbStatus.UNREACHABLE) {
            return probe.status();
        }

        // Try launching the container or docker compose if available
        ensurePostgresContainerRunning(hostPort.host(), hostPort.port());
        probe = probeDatabaseStatus(target.url(), target.username(), target.password());
        if (probe.status() != DbStatus.UNREACHABLE) {
            return probe.status();
        }

        String initialCause = probe.errorMessage() != null ? probe.errorMessage() : "Connection refused / timeout";
        log.warn("""
                ========================================================================================
                [OPENBAR] DATABASE CONNECTION ERROR:
                Unable to connect to PostgreSQL at {}:{} (target database: '{}').
                Error: {}
                Likely cause: Docker Desktop is paused, stopped, or the PostgreSQL container is down.
                Action required: Please unpause or start Docker Desktop to allow OpenBar to boot.
                OpenBar will retry every {}s...
                ========================================================================================
                """, hostPort.host(), hostPort.port(), target.dbName(), initialCause, waitConfig.pollIntervalSeconds());

        return pollUntilDatabaseReady(target, waitConfig, hostPort, initialCause);
    }

    /**
     * Loops polling PostgreSQL until reachable or until configured maximum wait time is exceeded.
     *
     * @param target Target database parameters
     * @param waitConfig Polling and retry configuration
     * @param hostPort Parsed host and port
     * @param initialError Initial probe error message
     * @return Final {@link DbStatus}
     */
    private static DbStatus pollUntilDatabaseReady(
            DatabaseTarget target,
            WaitConfig waitConfig,
            HostPort hostPort,
            String initialError) {

        int elapsedSeconds = 0;
        int attempt = 1;
        boolean isCi = isContinuousIntegrationEnvironment();
        int effectiveMaxWait = resolveEffectiveMaxWait(isCi, waitConfig.maxWaitSeconds());
        String currentError = initialError;

        while (true) {
            if (effectiveMaxWait > 0 && elapsedSeconds >= effectiveMaxWait) {
                String errorMsg = String.format(
                        "PostgreSQL at %s:%d (database: '%s') is not reachable after %d seconds (last error: %s). Application startup aborted.",
                        hostPort.host(), hostPort.port(), target.dbName(), elapsedSeconds, currentError);
                log.error(errorMsg);
                throw new IllegalStateException(errorMsg);
            }

            try {
                Thread.sleep(waitConfig.pollIntervalSeconds() * 1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Database connection wait loop was interrupted. Aborting startup.");
                throw new IllegalStateException("Database startup wait loop interrupted", e);
            }

            attempt++;
            elapsedSeconds += waitConfig.pollIntervalSeconds();

            if (elapsedSeconds % 15 == 0) {
                tryDockerStartContainer();
            }

            ProbeResult result = probeDatabaseStatus(target.url(), target.username(), target.password());
            if (result.status() != DbStatus.UNREACHABLE) {
                log.info("""
                        ========================================================================================
                        [OPENBAR] DATABASE CONNECTION ESTABLISHED:
                        Successfully connected to PostgreSQL at {}:{} after {}s ({} attempts)! Resuming startup...
                        ========================================================================================
                        """, hostPort.host(), hostPort.port(), elapsedSeconds, attempt);
                return result.status();
            }

            currentError = result.errorMessage() != null ? result.errorMessage() : "Connection refused / timeout";
            log.warn("[OPENBAR] Attempt #{} failed (elapsed: {}s). Error: {}. Retrying in {}s...",
                    attempt, elapsedSeconds, currentError, waitConfig.pollIntervalSeconds());
        }
    }

    /**
     * Resolves the effective maximum wait time taking into account CI environments.
     *
     * @param isCi Whether the current process runs in CI
     * @param maxWaitSeconds Configured maximum wait time in seconds
     * @return Resolved effective wait timeout in seconds
     */
    private static int resolveEffectiveMaxWait(boolean isCi, int maxWaitSeconds) {
        if (!isCi) {
            return maxWaitSeconds;
        }
        int resolved = maxWaitSeconds > 0 ? maxWaitSeconds : 30;
        return Math.min(resolved, 30);
    }

    /**
     * Checks if the current execution is within a Continuous Integration (CI) pipeline.
     *
     * @return true if running in CI, false otherwise
     */
    private static boolean isContinuousIntegrationEnvironment() {
        return System.getenv("CI") != null
                || System.getenv("GITHUB_ACTIONS") != null
                || System.getenv("CONTINUOUS_INTEGRATION") != null;
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
        java.util.Properties props = buildConnectionProperties(username, password, "3");

        try {
            return DriverManager.getConnection(postgresUrl, props);
        } catch (SQLException e) {
            if (!DEFAULT_POSTGRES.equalsIgnoreCase(username)) {
                try {
                    java.util.Properties fallbackProps = buildConnectionProperties(DEFAULT_POSTGRES, password, "3");
                    return DriverManager.getConnection(postgresUrl, fallbackProps);
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
