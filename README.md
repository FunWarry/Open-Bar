# Gestion Cocktail

Application de gestion de cocktails avec une architecture frontend/backend.

## Structure du projet

```
gestion-cocktail/
├── frontend/          # Application Angular
└── backend/           # Application Spring Boot
```

## Frontend

Le frontend est une application Angular qui gère l'interface utilisateur.

### Prérequis

- Node.js (v18 ou supérieur)
- npm (v9 ou supérieur)

### Installation

```bash
cd frontend
npm install
```

### Démarrage

#### Démarrage normale : L'application sera accessible à l'adresse `http://localhost:4200`.
```bash
ng serve
```

#### Démarrage sur le réseau local : L'application sera accessible à l'adresse `http://<IP_LOCAL>:4200`.
```bash
ng serve --host 0.0.0.0
```

## Backend

Le backend est une application Spring Boot qui gère la logique métier et la persistance des données.

### Prérequis

- Java 17 ou supérieur
- Maven 3.8 ou supérieur

### Installation

```bash
cd backend
mvn clean install
```

### Démarrage

```bash
mvn spring-boot:run
```

L'API sera accessible à l'adresse `http://localhost:8080`.

## Fonctionnalités

- Authentification des utilisateurs
- Gestion des cocktails
- Gestion des ingrédients
- Gestion des recettes
- Gestion des événements

## Sécurité

- Authentification JWT
- Rôles utilisateur (ADMIN, USER)
- Protection des routes
- Validation des données

## Développement

### Frontend

```bash
cd frontend
npm run build    # Compilation
npm run test     # Tests
npm run lint     # Linting
```

### Backend

```bash
cd backend
mvn clean install    # Compilation
mvn test            # Tests
mvn verify          # Vérification
```

## Description
Application de gestion de bar permettant aux serveurs de prendre des commandes, aux barmans de gérer les stocks et les commandes, et aux managers de superviser l'ensemble.

## Fonctionnalités Principales

### Gestion des Utilisateurs
- Authentification sécurisée
- Rôles : Serveur, Barman, Manager
- Gestion des permissions

### Gestion des Tables
- Plan de salle interactif
- Zones : Terrasse, Intérieur, Étage
- Système de réservation
- Fusion/division de tables

### Gestion des Cocktails
- Catalogue de cocktails
- Catégorisation (Alcoolisé, Sans alcool, Shot, etc.)
- Variantes de cocktails
- Gestion des recettes et ingrédients
- Système de saisonnalité

### Gestion des Commandes
- Prise de commande par table
- Système de priorité
- Notes spéciales (allergies, préférences)
- Suivi en temps réel
- Chronomètre de préparation

### Gestion des Stocks
- Suivi des ingrédients
- Seuils d'alerte
- Traçabilité des lots
- Calcul des coûts de revient

### Facturation
- Génération de factures
- Division de l'addition
- Gestion des pourboires
- Export des factures

### Statistiques et Rapports
- Tableaux de bord
- Rapports de vente
- Analyses de performance
- Export de données

## Architecture Technique

### Backend
- Spring Boot 3.2.3
- PostgreSQL
- JPA/Hibernate
- Spring Security
- WebSocket pour les notifications en temps réel

### Frontend (à venir)
- Angular
- Material Design
- Responsive Design
- Mode sombre/clair

## Installation

### Prérequis
- Java 17
- Maven
- PostgreSQL
- Node.js (pour le frontend)

### Configuration de la Base de Données
1. Créer une base de données PostgreSQL nommée `gestion_cocktail`
2. Configurer les paramètres de connexion dans `application.yml`

### Installation du Backend
```bash
mvn clean install
mvn spring-boot:run
```

### Installation du Frontend
```bash
cd frontend
npm install
npm start
```

## Sécurité
- Authentification JWT
- Journalisation des actions
- Sauvegarde quotidienne
- Réplication asynchrone de la base de données

## Contribution
Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence
Ce projet est sous licence MIT. 