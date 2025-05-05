package com.bar.gestioncocktail;

import com.bar.gestioncocktail.service.UserService;
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
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.logging.Logger;

@Component
public class DockerDbInitializer {

    private static final Logger logger = Logger.getLogger(DockerDbInitializer.class.getName());

    @Value("${spring.datasource.url}")
    private String dbUrl;
    @Value("${spring.datasource.username}")
    private String dbUser;
    @Value("${spring.datasource.password}")
    private String dbPass;

    private final DataSource dataSource;
    private final UserService userService;

    public DockerDbInitializer(DataSource dataSource, UserService userService) {
        this.dataSource = dataSource;
        this.userService = userService;
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

            // Test initial de connexion à la base de données
            if (!isDatabaseExists()) {
                logger.info("La base de données n'existe pas ou n'est pas accessible. Démarrage des conteneurs...");
                startDockerCompose();
                logger.info("Attente de la disponibilité de la base de données...");
                waitForDb();
                logger.info("Base de données disponible. Exécution du script schema.sql...");
                runSchemaSql();
                logger.info("Création de l'utilisateur administrateur...");
                createAdminUser();
            } else {
                logger.info("La base de données existe déjà et est accessible.");
            }

            logger.info("Initialisation terminée avec succès.");
        } catch (Exception e) {
            logger.severe("Erreur lors de l'initialisation Docker/DB: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur initialisation Docker/DB", e);
        }
    }

    private boolean isDockerRunning() {
        try {
            Process process = new ProcessBuilder("docker", "info").start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            logger.warning("Erreur lors de la vérification de Docker: " + e.getMessage());
            return false;
        }
    }

    private void startDocker() throws IOException, InterruptedException {
        String os = System.getProperty("os.name").toLowerCase();
        logger.info("Système d'exploitation détecté: " + os);

        Process process = null;
        if (os.contains("win")) {
            logger.info("Démarrage de Docker Desktop pour Windows...");
            process = new ProcessBuilder("cmd", "/c", "start", "\"\"", "\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"").start();
        } else if (os.contains("mac")) {
            logger.info("Démarrage de Docker pour macOS...");
            process = new ProcessBuilder("open", "-a", "Docker").start();
        } else {
            // Linux: suppose que Docker est un service
            logger.info("Démarrage du service Docker pour Linux...");
            process = new ProcessBuilder("sudo", "systemctl", "start", "docker").start();
        }

        if (process != null) {
            int exitCode = process.waitFor();
            logger.info("Démarrage de Docker terminé avec le code: " + exitCode);
        }

        logger.info("Attente du démarrage complet de Docker...");
        waitForDockerEngine();
    }

    private void waitForDockerEngine() throws InterruptedException {
        int maxRetries = 60;  // Maximum 5 minutes (60 * 5 secondes)
        int retryDelay = 5000; // 5 secondes entre chaque tentative
        int retries = 0;

        while (retries < maxRetries) {
            if (isDockerEngineRunning()) {
                logger.info("Moteur Docker opérationnel après " + retries + " tentatives");
                return;
            }
            retries++;
            logger.info("Docker n'est pas encore opérationnel. Tentative " + retries + "/" + maxRetries);
            Thread.sleep(retryDelay);
        }

        throw new RuntimeException("Le moteur Docker n'a pas démarré après " + (maxRetries * retryDelay / 1000) + " secondes");
    }

    private boolean isDockerEngineRunning() {
        try {
            // Vérification plus spécifique de l'état du moteur Docker
            Process process = new ProcessBuilder("docker", "info", "--format", "{{.ServerVersion}}").start();

            // Lire la sortie pour obtenir la version du serveur
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String version = reader.readLine();
                int exitCode = process.waitFor();

                if (exitCode == 0 && version != null && !version.isEmpty()) {
                    logger.info("Moteur Docker opérationnel (version " + version + ")");
                    return true;
                }
            }

            return false;
        } catch (Exception e) {
            logger.fine("Docker n'est pas encore prêt: " + e.getMessage());
            return false;
        }
    }
    
private boolean isDatabaseExists() {
    // Nom exact du conteneur défini dans docker-compose.yml
    String containerName = "gestion_cocktail_db";
    
    try {
        // Vérifier si le conteneur existe
        Process process = new ProcessBuilder("docker", "ps", "-a", "--filter", "name=" + containerName, "--format", "{{.Names}}")
                .redirectErrorStream(true)
                .start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            int exitCode = process.waitFor();
            
            String containerOutput = output.toString().trim();
            logger.info("Résultat de la recherche du conteneur: [" + containerOutput + "]");
            
            if (exitCode != 0) {
                logger.warning("Erreur lors de la vérification de l'existence du conteneur: code " + exitCode);
                return false;
            }
            
            boolean containerExists = !containerOutput.isEmpty();
            
            if (!containerExists) {
                logger.info("Le conteneur de base de données n'existe pas.");
                return false;
            }
            
            logger.info("Le conteneur " + containerName + " existe. Vérification de son état...");
            
            // Vérifier si le conteneur est en cours d'exécution
            Process statusProcess = new ProcessBuilder("docker", "inspect", "--format", "{{.State.Running}}", containerName)
                    .redirectErrorStream(true)
                    .start();
                    
            try (BufferedReader statusReader = new BufferedReader(new InputStreamReader(statusProcess.getInputStream()))) {
                String status = statusReader.readLine();
                statusProcess.waitFor();
                
                if (!"true".equalsIgnoreCase(status)) {
                    logger.info("Le conteneur " + containerName + " n'est pas en cours d'exécution. Tentative de démarrage...");
                    
                    // Démarrer le conteneur
                    Process startProcess = new ProcessBuilder("docker", "start", containerName)
                            .redirectErrorStream(true)
                            .start();
                    
                    startProcess.waitFor();
                    logger.info("Tentative de démarrage du conteneur terminée.");
                    
                    // Attendre un peu que le conteneur démarre complètement
                    Thread.sleep(5000);
                } else {
                    logger.info("Le conteneur " + containerName + " est déjà en cours d'exécution.");
                }
            }
            
            // Vérifier si on peut se connecter à la base de données et si elle a une structure
            try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass)) {
                logger.info("Connexion à la base de données réussie.");
                
                // Vérifier si la structure existe (vérifier l'existence d'une table importante)
                try (var stmt = conn.createStatement();
                     var rs = stmt.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")) {
                    if (rs.next() && rs.getInt(1) > 0) {
                        logger.info("La base de données contient des tables.");
                        return true;
                    } else {
                        logger.info("La base de données existe mais ne contient pas de tables.");
                        return false;
                    }
                } catch (SQLException e) {
                    logger.warning("Erreur lors de la vérification de la structure de la base de données: " + e.getMessage());
                    return false;
                }
            } catch (SQLException e) {
                logger.warning("Connexion à la base de données impossible: " + e.getMessage());
                return false;
            }
        }
    } catch (Exception e) {
        logger.warning("Erreur lors de la vérification du conteneur: " + e.getMessage());
        e.printStackTrace();
        return false;
    }
}

private boolean isDatabaseCreated() {
    try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass)) {
        logger.info("Connexion à la base de données réussie.");
        return true;
    } catch (SQLException e) {
        logger.warning("Erreur lors de la connexion à la base de données: " + e.getMessage());
        return false;
    }
}

    private void startDockerCompose() throws IOException, InterruptedException {
        File projectRoot = new File("backend/src/main/resources/docker-compose.yml").getAbsoluteFile().getParentFile();
        logger.info("Démarrage de docker-compose dans le répertoire: " + projectRoot.getAbsolutePath());

        Process process = new ProcessBuilder("docker-compose", "up", "-d")
                .directory(projectRoot)
                .redirectErrorStream(true)
                .start();

        // Log the output for debugging
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                logger.info(line);
            }
        }

        int exitCode = process.waitFor();
        logger.info("docker-compose terminé avec le code: " + exitCode);
        if (exitCode != 0) {
            throw new RuntimeException("Erreur lors du démarrage de docker-compose");
        }
    }

    private void waitForDb() throws InterruptedException {
        int retries = 30; // Augmenter le nombre de tentatives
        int delay = 5000; // 5 secondes entre chaque tentative
        logger.info("Tentatives de connexion à la base de données: " + retries + " avec délai de " + delay + "ms");

        while (retries-- > 0) {
            if (isDatabaseCreated()) {
                logger.info("Connexion à la base de données réussie après des tentatives.");
                return;
            }
            logger.info("Tentative de connexion échouée. Attente avant nouvelle tentative. Essais restants: " + retries);
            Thread.sleep(delay);
        }
        throw new RuntimeException("La base de données n'est pas disponible après plusieurs tentatives.");
    }

    private void runSchemaSql() {
        try (Connection conn = dataSource.getConnection()) {
            logger.info("Exécution du script schema.sql...");
            ScriptUtils.executeSqlScript(conn, new ClassPathResource("schema.sql"));
            logger.info("Script schema.sql exécuté avec succès.");
        } catch (Exception e) {
            logger.severe("Erreur lors de l'exécution du script schema.sql: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de l'exécution du script schema.sql", e);
        }
    }

    private void createAdminUser() {
        try {
            userService.createAdminUser();
            logger.info("Utilisateur administrateur créé avec succès.");
        } catch (Exception e) {
            logger.severe("Erreur lors de la création de l'utilisateur administrateur: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la création de l'utilisateur administrateur", e);
        }
    }
}