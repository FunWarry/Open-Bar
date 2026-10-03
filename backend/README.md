# ☕ OpenBar — Backend API & Services

> **Serveur REST & Broker WebSocket temps réel pour OpenBar**  
> Développé avec **Spring Boot 4.1.1**, **Java 22 (épinglé)**, **PostgreSQL 15/16**, et **JJWT 0.13.0**.

---

## 🌟 Vue d'ensemble

Le backend d'OpenBar fournit l'ensemble des services métiers, la persistance relationnelle, les communications temps réel par WebSocket STOMP, et le pilotage matériel direct (terminaux TPE et imprimantes thermiques ESC/POS) pour les débits de boissons et restaurants :
- **Architecture en Couches Étanche** : Découplage strict `Controller → Service → Repository`.
- **Zéro Entité JPA Exposée** : 100% des points d'entrée REST retournent des DTOs immuables (`Java records`) avec constructeur statique `from(Entity)`.
- **Sécurité Rôles & JWT Stateless** : Rôles `ADMIN`, `MANAGER`, `SERVEUR`, `BARMAN`, rotation des jetons refresh et timeout d'inactivité de session à 4h.
- **Bus Événementiel Interne** : Spring `ApplicationEventPublisher` pour dissocier les transactions d'écriture des tâches asynchrones d'impression ou de notification.
- **Pilotage Matériel Réseau Local** :
  - Client socket TCP direct sur port `8888` pour le protocole monétique bancaire **Concert IP**.
  - Client socket TCP direct sur port `9100` pour l'impression thermique binaire **ESC/POS**.
- **Conformité Fiscale Légale** : Numérotation séquentielle des factures inaltérable, clôture journalière Z-Report scellée par empreinte SHA-256, et génération d'export comptable normalisé FEC.

---

## 🏛️ Stack Technique Backend

| Couche | Technologie | Version | Détails & Rôle |
|--------|-------------|---------|----------------|
| **Runtime** | **Java** | **22 (épinglé)** | Lombok 1.18.34 incompatible JDK 23+. JDK 22 obligatoire pour compiler. |
| **Framework** | **Spring Boot** | **4.1.1** | Gestionnaire IoC, Spring Data JPA, validation Bean Validation, Spring Security. |
| **Sécurité** | **Spring Security + JJWT** | **0.13.0** | Authentification stateless JWT, rotation refresh tokens, contrôle `@PreAuthorize`. |
| **Base de Données** | **PostgreSQL** | **15 / 16** | Stockage ACID, intégrité référentielle, indexation avancée. |
| **Temps Réel** | **WebSocket STOMP** | Natif Spring | Broker STOMP en mémoire, 11 topics avec routage sélectif. |
| **Monétique TPE** | **Concert IP Socket** | Natif Java | Communication binaire directe avec les terminaux de paiement (port 8888). |
| **Impression Réseau** | **ESC/POS Socket Client** | Natif Java | Envoi direct de trames ESC/POS CP850 aux imprimantes tickets (port 9100). |
| **Génération PDF** | **OpenPDF** | **2.0.3** | Émission de factures A4, Z-Reports certifiés et chevalets de table QR. |
| **Génération QR** | **ZXing** | **3.5.4** | Rendu matriciel PNG et SVG pour les tables et le Wi-Fi invité. |
| **Assainissement HTML** | **Jsoup** | **1.23.2** | Protection contre les injections XSS sur l'ensemble des DTOs textuels. |
| **Documentation API** | **Springdoc OpenAPI** | **3.1.0** | Swagger UI interactif et génération du contrat OpenAPI v3. |

---

## 📁 Structure du Projet

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/bar/gestioncocktail/
│   │   │   ├── config/          # Configurations Spring (Sécurité, STOMP, Async, Swagger, Time)
│   │   │   ├── controller/      # Contrôleurs REST (@Tag OpenAPI, @PreAuthorize systématique)
│   │   │   ├── dto/             # Java records immuables avec static from(Entity)
│   │   │   ├── event/           # Événements métier du domaine
│   │   │   ├── exception/       # Exceptions typées (ResourceNotFoundException, BusinessException)
│   │   │   ├── listener/        # Écouteurs d'événements asynchrones (@Async)
│   │   │   ├── model/           # Entités JPA Hibernate (@Data Lombok, @PrePersist/@PreUpdate)
│   │   │   ├── printer/         # Moteur d'impression directe ESC/POS socket TCP 9100
│   │   │   ├── repository/      # Interfaces Spring Data JPA
│   │   │   ├── security/        # Filtres JWT, token provider, gestionnaire de session
│   │   │   ├── service/         # Logique métier pure (@Transactional sur écritures)
│   │   │   └── tpe/             # Moteur de monétique Concert IP socket TCP 8888
│   │   └── resources/
│   │       ├── application.yml  # Configuration applicative
│   │       ├── schema.sql       # Schéma relationnel complet & tables
│   │       └── data/            # Jeu de données de démonstration (demo_dataset.json)
│   └── test/
│       └── java/com/bar/gestioncocktail/
│           ├── controller/      # Tests contrôleurs MockMvc
│           ├── integration/     # Tests d'intégration Spring Boot + Testcontainers
│           └── service/         # Tests unitaires de services (JUnit 5 + Mockito)
└── pom.xml                      # Descripteur de build Maven
```

---

## ⚙️ Configuration & Variables d'Environnement

Le backend requiert impérativement la variable d'environnement `JWT_SECRET` pour démarrer :

| Variable | Description | Exemple / Valeur par défaut |
|----------|-------------|-----------------------------|
| `JWT_SECRET` | Clé secrète HMAC-SHA (≥ 32 caractères / 256 bits) — **obligatoire** | `openssl rand -base64 32` |
| `SPRING_DATASOURCE_URL` | URL JDBC PostgreSQL | `jdbc:postgresql://localhost:5432/gestion_cocktail` |
| `SPRING_DATASOURCE_USERNAME` | Utilisateur BDD | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Mot de passe BDD | `postgres` |
| `OPENBAR_CORS_ALLOWED_ORIGINS` | Origines autorisées pour CORS | `http://localhost:4200,https://openbar.lan` |

---

## 🚀 Commandes de Développement

### Lancer la base de données PostgreSQL (Docker)
```bash
cd backend/src/main/resources
docker compose up -d
```

### Compiler et valider sans erreurs
```bash
mvn test-compile
```

### Lancer les tests unitaires et d'intégration
```bash
mvn test
```

### Lancer le serveur backend
```bash
export JWT_SECRET="your-super-secret-key-with-at-least-32-characters"
mvn spring-boot:run
```
L'API REST est accessible sur `http://localhost:8080`.  
La documentation interactive Swagger UI est disponible sur `http://localhost:8080/swagger-ui/index.html`.

---

## 📋 Conventions & Règles Absolues

1. **Injection par constructeur uniquement** — Jamais de `@Autowired` sur un champ.
2. **DTOs de sortie systématiques** — Jamais d'entité JPA retournée directement dans une réponse HTTP.
3. **`@Transactional` obligatoire** sur toutes les méthodes d'écriture des services.
4. **`@PreAuthorize` obligatoire** sur tous les endpoints d'écriture.
5. **JavaDoc en anglais obligatoire** sur tous les services, DTOs, contrôleurs et entités.
6. **Annotations OpenAPI (`@Operation`, `@ApiResponse`) obligatoires** sur tous les contrôleurs REST.
