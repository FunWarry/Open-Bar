-- Suppression des tables existantes
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cocktail_ingredients CASCADE;
DROP TABLE IF EXISTS cocktail_variantes CASCADE;
DROP TABLE IF EXISTS cocktails CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS commande_items CASCADE;
DROP TABLE IF EXISTS commandes CASCADE;
DROP TABLE IF EXISTS facture_items CASCADE;
DROP TABLE IF EXISTS factures CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Création des tables
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nom VARCHAR(50),
    prenom VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id),
    roles VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, roles)
);

CREATE TABLE cocktails (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    categorie VARCHAR(50) NOT NULL,
    disponible BOOLEAN DEFAULT true,
    saisonnier BOOLEAN DEFAULT false,
    date_debut_saison TIMESTAMP,
    date_fin_saison TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE ingredients (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    quantite DECIMAL(10,2) NOT NULL,
    unite_mesure VARCHAR(20) NOT NULL,
    seuil_alerte DECIMAL(10,2),
    fournisseur VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE cocktail_ingredients (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id),
    ingredient_id BIGINT REFERENCES ingredients(id),
    quantite DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE cocktail_variantes (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id),
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix_supplement DECIMAL(10,2) DEFAULT 0,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE tables (
    id BIGSERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    zone VARCHAR(50) NOT NULL,
    capacite INTEGER NOT NULL,
    occupee BOOLEAN DEFAULT false,
    serveur_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE commandes (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT REFERENCES tables(id),
    serveur_id BIGINT REFERENCES users(id),
    statut VARCHAR(20) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    date_commande TIMESTAMP NOT NULL,
    date_preparation TIMESTAMP,
    date_livraison TIMESTAMP,
    date_reglement TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE commande_items (
    id BIGSERIAL PRIMARY KEY,
    commande_id BIGINT REFERENCES commandes(id),
    cocktail_id BIGINT REFERENCES cocktails(id),
    cocktail_variante_id BIGINT REFERENCES cocktail_variantes(id),
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    prioritaire BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE factures (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT REFERENCES tables(id),
    numero VARCHAR(50) UNIQUE NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    pourboire DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) NOT NULL,
    reglee BOOLEAN DEFAULT false,
    mode_paiement VARCHAR(50),
    date_emission TIMESTAMP NOT NULL,
    date_reglement TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE facture_items (
    id BIGSERIAL PRIMARY KEY,
    facture_id BIGINT REFERENCES factures(id),
    description VARCHAR(255) NOT NULL,
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP NOT NULL
); 