package com.bar.gestioncocktail;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.logging.Level;
import java.util.logging.Logger;

@Component
@SuppressWarnings("java:S4036") // Dev utility: commands (docker, cmd, sudo) are intentionally resolved via PATH
public class DockerDbInitializer {

    private static final Logger logger = Logger.getLogger(DockerDbInitializer.class.getName());
    private static final String DOCKER_CMD = "docker";
    private static final String CONTAINER_NAME = "gestion_cocktail_db";
    private static final String FORMAT_OPTION = "--format";
    private static final String START_CMD = "start";

    @Value("${spring.datasource.url}")
    private String dbUrl;
    @Value("${spring.datasource.username}")
    private String dbUser;
    @Value("${spring.datasource.password}")
    private String dbPass;

    private final DataSource dataSource;

    public DockerDbInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public void init() {
        try {
            logger.info("Initialisation Docker et base de données...");

            if (!isDockerRunning()) {
                logger.info("Docker n'est pas en cours d'exécution. Démarrage...");
                startDocker();
            } else {
                logger.info("Docker est déjà en cours d'exécution.");
            }

            if (!isDatabaseExists()) {
                logger.info("La base de données n'existe pas ou n'est pas accessible. Démarrage des conteneurs...");
                startDockerCompose();
                logger.info("Attente de la disponibilité de la base de données...");
                waitForDb();
                logger.info("Base de données disponible. Exécution du script schema.sql...");
                runSchemaSql();
            } else {
                logger.info("La base de données existe déjà et est accessible.");
            }

            logger.info("Initialisation terminée avec succès.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.log(Level.WARNING, "Init interrompu: {0}", e.getMessage());
        } catch (Exception e) {
            logger.log(Level.WARNING, "Avertissement lors de l''initialisation Docker/DB (non bloquant): {0}", e.getMessage());
        }
    }

    private boolean isDockerRunning() {
        try {
            Process process = new ProcessBuilder(DOCKER_CMD, "info").start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.log(Level.WARNING, "Vérification Docker interrompue: {0}", e.getMessage());
            return false;
        } catch (Exception e) {
            logger.log(Level.WARNING, "Erreur lors de la vérification de Docker: {0}", e.getMessage());
            return false;
        }
    }

    private void startDocker() throws IOException, InterruptedException {
        String os = System.getProperty("os.name").toLowerCase();
        logger.log(Level.INFO, "Système d''exploitation détecté: {0}", os);

        Process process = null;
        if (os.contains("win")) {
            logger.info("Démarrage de Docker Desktop pour Windows...");
            process = new ProcessBuilder("cmd", "/c", START_CMD, "\"\"", "\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"").start();
        } else if (os.contains("mac")) {
            logger.info("Démarrage de Docker pour macOS...");
            process = new ProcessBuilder("open", "-a", "Docker").start();
        } else {
            logger.info("Démarrage du service Docker pour Linux...");
            process = new ProcessBuilder("sudo", "systemctl", START_CMD, DOCKER_CMD).start();
        }

        if (process != null) {
            int exitCode = process.waitFor();
            logger.log(Level.INFO, "Démarrage de Docker terminé avec le code: {0}", exitCode);
        }

        logger.info("Attente du démarrage complet de Docker...");
        waitForDockerEngine();
    }

    private void waitForDockerEngine() throws InterruptedException {
        int maxRetries = 60;
        int retryDelay = 5000;
        int retries = 0;

        while (retries < maxRetries) {
            if (isDockerEngineRunning()) {
                logger.log(Level.INFO, "Moteur Docker opérationnel après {0} tentatives", retries);
                return;
            }
            retries++;
            logger.log(Level.INFO, "Docker n''est pas encore opérationnel. Tentative {0}/{1}", new Object[]{retries, maxRetries});
            Thread.sleep(retryDelay);
        }

        throw new IllegalStateException("Le moteur Docker n'a pas démarré après la durée maximale.");
    }

    private boolean isDockerEngineRunning() {
        try {
            Process process = new ProcessBuilder(DOCKER_CMD, "info", FORMAT_OPTION, "{{.ServerVersion}}").start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String version = reader.readLine();
                int exitCode = process.waitFor();

                if (exitCode == 0 && version != null && !version.isEmpty()) {
                    logger.log(Level.INFO, "Moteur Docker opérationnel (version {0})", version);
                    return true;
                }
            }
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            logger.log(Level.FINE, "Docker n''est pas encore prêt: {0}", e.getMessage());
            return false;
        }
    }

    private boolean isDatabaseExists() {
        try {
            Process process = new ProcessBuilder(DOCKER_CMD, "ps", "-a", "--filter", "name=" + CONTAINER_NAME, FORMAT_OPTION, "{{.Names}}")
                    .redirectErrorStream(true)
                    .start();

            String containerOutput;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
                process.waitFor();
                containerOutput = output.toString().trim();
            }

            if (containerOutput.isEmpty()) {
                logger.info("Le conteneur de base de données n'existe pas.");
                return false;
            }

            ensureContainerRunning();
            return checkTablesExist();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.log(Level.WARNING, "Vérification conteneur interrompue: {0}", e.getMessage());
            return false;
        } catch (Exception e) {
            logger.log(Level.WARNING, "Erreur lors de la vérification du conteneur: {0}", e.getMessage());
            return false;
        }
    }

    private void ensureContainerRunning() throws IOException, InterruptedException {
        Process statusProcess = new ProcessBuilder(DOCKER_CMD, "inspect", FORMAT_OPTION, "{{.State.Running}}", CONTAINER_NAME)
                .redirectErrorStream(true)
                .start();

        String status;
        try (BufferedReader statusReader = new BufferedReader(new InputStreamReader(statusProcess.getInputStream()))) {
            status = statusReader.readLine();
            statusProcess.waitFor();
        }

        if (!"true".equalsIgnoreCase(status)) {
            logger.log(Level.INFO, "Le conteneur {0} n''est pas en cours d''exécution. Démarrage...", CONTAINER_NAME);
            Process startProcess = new ProcessBuilder(DOCKER_CMD, START_CMD, CONTAINER_NAME)
                    .redirectErrorStream(true)
                    .start();
            startProcess.waitFor();
            Thread.sleep(5000);
        }
    }

    private boolean checkTablesExist() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")) {
            if (rs.next() && rs.getInt(1) > 0) {
                logger.info("La base de données contient des tables.");
                return true;
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "Erreur lors de la vérification de la structure de la base de données: {0}", e.getMessage());
        }
        return false;
    }

    private boolean isDatabaseCreated() {
        try (Connection conn = dataSource.getConnection()) {
            return conn != null;
        } catch (SQLException e) {
            return false;
        }
    }

    private void startDockerCompose() throws IOException, InterruptedException {
        File dockerComposeFile = new File("src/main/resources/docker-compose.yml").getAbsoluteFile();
        File projectRoot = dockerComposeFile.getParentFile();

        String[] command;
        try {
            Process check = new ProcessBuilder(DOCKER_CMD, "compose", "version").start();
            check.waitFor();
            command = new String[]{DOCKER_CMD, "compose", "-f", dockerComposeFile.getAbsolutePath(), "up", "-d"};
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            command = new String[]{"docker-compose", "-f", dockerComposeFile.getAbsolutePath(), "up", "-d"};
        } catch (Exception e) {
            command = new String[]{"docker-compose", "-f", dockerComposeFile.getAbsolutePath(), "up", "-d"};
        }

        Process process = new ProcessBuilder(command)
                .directory(projectRoot)
                .redirectErrorStream(true)
                .start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                logger.info(line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new IllegalStateException("Erreur lors du démarrage de docker-compose");
        }
    }

    private void waitForDb() throws InterruptedException {
        int retries = 30;
        int delay = 5000;

        while (retries-- > 0) {
            if (isDatabaseCreated()) {
                logger.info("Connexion à la base de données réussie après des tentatives.");
                return;
            }
            Thread.sleep(delay);
        }
        throw new IllegalStateException("La base de données n'est pas disponible après plusieurs tentatives.");
    }

    private void runSchemaSql() {
        try (Connection conn = dataSource.getConnection()) {
            logger.info("Exécution du script schema.sql...");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("schema.sql"));
            logger.info("Script schema.sql exécuté avec succès.");
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Erreur lors de l''exécution du script schema.sql: {0}", e.getMessage());
            throw new IllegalStateException("Erreur lors de l'exécution du script schema.sql", e);
        }
    }
}