-- Création des tables
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nom VARCHAR(50),
    prenom VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT REFERENCES users(id),
    roles VARCHAR(20) NOT NULL CHECK (roles IN ('ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN')),
    PRIMARY KEY (user_id, roles)
);
-- Migration existant : UPDATE user_roles SET roles = 'BARMAN' WHERE roles = 'BARMEN';

CREATE TABLE IF NOT EXISTS cocktails (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    categorie VARCHAR(50) NOT NULL,
    vat_rate VARCHAR(20) DEFAULT 'TWENTY',
    disponible BOOLEAN DEFAULT true,
    saisonnier BOOLEAN DEFAULT false,
    date_debut_saison TIMESTAMP,
    date_fin_saison TIMESTAMP,
    mois_debut INT,
    mois_fin INT,
    instructions TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    quantite DECIMAL(10,2) DEFAULT 0,
    unite_mesure VARCHAR(20) NOT NULL,
    seuil_alerte DECIMAL(10,2),
    fournisseur VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS cocktail_ingredients (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id),
    ingredient_id BIGINT REFERENCES ingredients(id),
    quantite DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cocktail_variantes (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id),
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix_supplement DECIMAL(10,2) DEFAULT 0,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
    id BIGSERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    zone VARCHAR(50) NOT NULL,
    capacite INTEGER NOT NULL,
    occupee BOOLEAN DEFAULT false,
    serveur_id BIGINT REFERENCES users(id),
    date_occupation TIMESTAMP,
    date_liberation TIMESTAMP,
    plan_x DOUBLE PRECISION,
    plan_y DOUBLE PRECISION,
    plan_rotation DOUBLE PRECISION DEFAULT 0,
    plan_forme VARCHAR(20) DEFAULT 'CARRE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    ordre INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zones (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    etage VARCHAR(50) DEFAULT 'RDC',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commandes (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT REFERENCES tables(id),
    serveur_id BIGINT REFERENCES users(id),
    tracking_token VARCHAR(255) UNIQUE,
    statut VARCHAR(20) NOT NULL,
    notes TEXT,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    pourboire DECIMAL(10,2),
    date_commande TIMESTAMP NOT NULL,
    date_preparation TIMESTAMP,
    date_livraison TIMESTAMP,
    date_reglement TIMESTAMP,
    date_modification TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commande_items (
    id BIGSERIAL PRIMARY KEY,
    commande_id BIGINT REFERENCES commandes(id),
    cocktail_id BIGINT REFERENCES cocktails(id),
    cocktail_variante_id BIGINT REFERENCES cocktail_variantes(id),
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    prioritaire BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT REFERENCES tables(id),
    numero VARCHAR(50) UNIQUE NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    pourboire DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) NOT NULL,
    reglee BOOLEAN DEFAULT false,
    mode_paiement VARCHAR(50),
    notes TEXT,
    date_facture TIMESTAMP,
    date_emission TIMESTAMP,
    date_reglement TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facture_items (
    id BIGSERIAL PRIMARY KEY,
    facture_id BIGINT REFERENCES factures(id),
    description VARCHAR(255) NOT NULL,
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS facture_seq START 1;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL
);

-- Plan de salle : colonnes de position
ALTER TABLE tables ADD COLUMN IF NOT EXISTS plan_x DOUBLE PRECISION;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS plan_y DOUBLE PRECISION;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS plan_rotation DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS plan_forme VARCHAR(20) DEFAULT 'CARRE';

-- Saisonnalité par mois (1-12), null = toute l'année
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS mois_debut INTEGER;
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS mois_fin INTEGER;

-- Personnalisation admin (#153) : table singleton, une seule ligne (id=1)
CREATE TABLE IF NOT EXISTS app_settings (
    id BIGINT PRIMARY KEY,
    primary_color VARCHAR(7) NOT NULL DEFAULT '#6c7fe8',
    primary_color_strong VARCHAR(7) NOT NULL DEFAULT '#5a68d6',
    logo_url VARCHAR(2048),
    establishment_name VARCHAR(100) NOT NULL DEFAULT 'OpenBar',
    default_theme VARCHAR(20) NOT NULL DEFAULT 'DARK',
    temps_alerte_commande_minutes INTEGER NOT NULL DEFAULT 5,
    temps_alerte_critique_commande_minutes INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP
);

-- Garantit que la ligne singleton existe dès le déploiement, pour éviter toute
-- course entre requêtes GET /api/settings concurrentes au premier démarrage.
INSERT INTO app_settings (id, primary_color, primary_color_strong, establishment_name, default_theme, temps_alerte_commande_minutes, temps_alerte_critique_commande_minutes)
VALUES (1, '#6c7fe8', '#5a68d6', 'OpenBar', 'DARK', 5, 10)
ON CONFLICT (id) DO NOTHING;

-- Legal establishment configuration (#129)
CREATE TABLE IF NOT EXISTS establishment_config (
    id BIGINT PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL DEFAULT 'OpenBar SARL',
    legal_form VARCHAR(50) DEFAULT 'SARL',
    siret VARCHAR(14) DEFAULT '12345678900010',
    rcs_city VARCHAR(100) DEFAULT 'Paris',
    rcs_number VARCHAR(50) DEFAULT 'B 123 456 789',
    tva_number VARCHAR(20) DEFAULT 'FR12123456789',
    code_ape VARCHAR(10) DEFAULT '5630Z',
    capital_social DECIMAL(12,2) DEFAULT 10000.00,
    address VARCHAR(500) DEFAULT '12 Rue du Bar, 75001 Paris',
    phone VARCHAR(50) DEFAULT '+33123456789',
    email VARCHAR(100) DEFAULT 'contact@openbar.local',
    payment_terms VARCHAR(255) DEFAULT 'Paiement immédiat à réception',
    discount_policy VARCHAR(255) DEFAULT 'Aucun escompte pour paiement anticipé',
    late_payment_rate DECIMAL(5,4) DEFAULT 0.1200,
    time_zone VARCHAR(50) DEFAULT 'SYSTEM',
    ticket_format VARCHAR(10) DEFAULT '80mm',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO establishment_config (id, created_at, updated_at) VALUES (1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING;
ALTER TABLE establishment_config ADD COLUMN IF NOT EXISTS time_zone VARCHAR(50) DEFAULT 'SYSTEM';
ALTER TABLE establishment_config ADD COLUMN IF NOT EXISTS ticket_format VARCHAR(10) DEFAULT '80mm';

-- Immutabilité, intégrité & archivage des factures (#131, #132)
ALTER TABLE factures ADD COLUMN IF NOT EXISTS total_ht DECIMAL(10,2) DEFAULT 0;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS total_vat DECIMAL(10,2) DEFAULT 0;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS archived_pdf_path VARCHAR(500);
ALTER TABLE factures ADD COLUMN IF NOT EXISTS pdf_hash VARCHAR(64);
ALTER TABLE factures ADD COLUMN IF NOT EXISTS date_facture TIMESTAMP;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE facture_items ADD COLUMN IF NOT EXISTS vat_rate VARCHAR(20) DEFAULT 'TWENTY';
ALTER TABLE facture_items ADD COLUMN IF NOT EXISTS price_ht DECIMAL(10,2);
ALTER TABLE facture_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2);

-- Gestion des stocks ingrédients (#206) : colonnes manquantes
ALTER TABLE ingredients ALTER COLUMN quantite DROP NOT NULL;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS quantite_stock DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS numero_lot VARCHAR(100);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS date_peremption TIMESTAMP;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS prix_unitaire DECIMAL(10,2);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Table des avoirs de crédit (#131)
CREATE TABLE IF NOT EXISTS avoirs_credit (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    facture_id BIGINT REFERENCES factures(id),
    total_ht DECIMAL(10,2) NOT NULL,
    total_vat DECIMAL(10,2) NOT NULL,
    total_ttc DECIMAL(10,2) NOT NULL,
    motif_annulation TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Colonnes complémentaires commandes (#219)
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(255);
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS pourboire DECIMAL(10,2);
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP;

-- Colonnes occupation tables (#219)
ALTER TABLE tables ADD COLUMN IF NOT EXISTS date_occupation TIMESTAMP;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS date_liberation TIMESTAMP;

-- Colonnes horodatage par défaut
ALTER TABLE cocktail_ingredients ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE cocktail_ingredients ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE commande_items ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE commande_items ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE facture_items ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE facture_items ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Table des créneaux de travail (Shifts employés) (#232/#233)
CREATE TABLE IF NOT EXISTS employee_shifts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    date_shift DATE NOT NULL,
    type_shift VARCHAR(20) NOT NULL,
    type_poste VARCHAR(20) NOT NULL,
    heure_debut VARCHAR(10) NOT NULL,
    heure_fin VARCHAR(10) NOT NULL,
    heures_effectuees DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);