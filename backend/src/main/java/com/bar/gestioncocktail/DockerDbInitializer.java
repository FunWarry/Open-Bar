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
                logger.info("Docker n'est pas en cours d'exécution. Tentative de démarrage...");
                startDocker();
            } else {
                logger.info("Le service Docker est en cours d'exécution.");
            }

            if (!isDatabaseExists()) {
                logger.info("La base de données n'existe pas. Création via Docker...");
                startDockerCompose();
                waitForDatabaseReady();
                executeSchemaSql();
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

    private Process executeProcess(File workingDir, boolean redirectError, String... command) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(command);
        if (workingDir != null) {
            pb.directory(workingDir);
        }
        if (redirectError) {
            pb.redirectErrorStream(true);
        }
        return pb.start();
    }

    private boolean isDockerRunning() {
        try {
            Process process = executeProcess(null, false, DOCKER_CMD, "info");
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

        Process process;
        if (os.contains("win")) {
            logger.info("Démarrage de Docker Desktop pour Windows...");
            process = executeProcess(null, false, "cmd", "/c", START_CMD, "\"\"", "\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"");
        } else if (os.contains("mac")) {
            logger.info("Démarrage de Docker pour macOS...");
            process = executeProcess(null, false, "open", "-a", "Docker");
        } else {
            logger.info("Démarrage du service Docker pour Linux...");
            process = executeProcess(null, false, "sudo", "systemctl", START_CMD, DOCKER_CMD);
        }

        int exitCode = process.waitFor();
        logger.log(Level.INFO, "Démarrage de Docker terminé avec le code: {0}", exitCode);

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
            Process process = executeProcess(null, false, DOCKER_CMD, "info", FORMAT_OPTION, "{{.ServerVersion}}");

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String version = reader.readLine();
                int exitCode = process.waitFor();

                if (exitCode == 0 && version != null && !version.isEmpty()) {
                    logger.log(Level.INFO, "Moteur Docker opérationnel (version {0})", version);
                    return true;
                }
            }
            return false;
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            logger.log(Level.FINE, "Docker n''est pas encore prêt: {0}", e.getMessage());
            return false;
        }
    }

    private boolean isDatabaseExists() {
        try {
            Process process = executeProcess(null, true, DOCKER_CMD, "ps", "-a", "--filter", "name=" + CONTAINER_NAME, FORMAT_OPTION, "{{.Names}}");

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
        Process statusProcess = executeProcess(null, true, DOCKER_CMD, "inspect", FORMAT_OPTION, "{{.State.Running}}", CONTAINER_NAME);

        String status;
        try (BufferedReader statusReader = new BufferedReader(new InputStreamReader(statusProcess.getInputStream()))) {
            status = statusReader.readLine();
            statusProcess.waitFor();
        }

        if (!"true".equalsIgnoreCase(status)) {
            logger.log(Level.INFO, "Le conteneur {0} n''est pas en cours d''exécution. Démarrage...", CONTAINER_NAME);
            Process startProcess = executeProcess(null, true, DOCKER_CMD, START_CMD, CONTAINER_NAME);
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
        } catch (SQLException _) {
            return false;
        }
    }

    private void startDockerCompose() throws IOException, InterruptedException {
        File dockerComposeFile = new File("src/main/resources/docker-compose.yml").getAbsoluteFile();
        File projectRoot = dockerComposeFile.getParentFile();

        String[] command;
        try {
            Process check = executeProcess(null, false, DOCKER_CMD, "compose", "version");
            check.waitFor();
            command = new String[]{DOCKER_CMD, "compose", "-f", dockerComposeFile.getAbsolutePath(), "up", "-d"};
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
            command = new String[]{"docker-compose", "-f", dockerComposeFile.getAbsolutePath(), "up", "-d"};
        } catch (Exception _) {
            command = new String[]{"docker-compose", "-f", dockerComposeFile.getAbsolutePath(), "up", "-d"};
        }

        Process process = executeProcess(projectRoot, true, command);

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

    private void waitForDatabaseReady() throws InterruptedException {
        logger.info("Attente du démarrage de la base de données...");
        int maxRetries = 30;
        int retryDelay = 2000;
        int retries = 0;

        while (retries < maxRetries) {
            if (isDatabaseCreated()) {
                logger.log(Level.INFO, "Base de données prête après {0} tentatives", retries);
                return;
            }
            retries++;
            logger.log(Level.INFO, "Attente de la base de données... Tentative {0}/{1}", new Object[]{retries, maxRetries});
            Thread.sleep(retryDelay);
        }

        throw new IllegalStateException("La base de données n'a pas démarré après la durée maximale.");
    }

    private void executeSchemaSql() throws SQLException {
        logger.info("Exécution du script schema.sql...");
        try (Connection conn = dataSource.getConnection()) {
            ClassPathResource resource = new ClassPathResource("schema.sql");
            ScriptUtils.executeSqlScript(conn, resource);
            logger.info("Script schema.sql exécuté avec succès.");
        }
    }
}