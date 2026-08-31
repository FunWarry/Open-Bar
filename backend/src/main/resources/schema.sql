-- ==============================================================================
-- OpenBar — Clean Fresh Database Architecture Schema
-- ==============================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nom VARCHAR(50),
    prenom VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    roles VARCHAR(20) NOT NULL CHECK (roles IN ('ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN')),
    PRIMARY KEY (user_id, roles)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL
);

-- 2. Glassware & Cocktails Catalog
CREATE TABLE IF NOT EXISTS glassware (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    contenance_cl DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    description TEXT,
    is_predefined BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    mois_debut INTEGER,
    mois_fin INTEGER,
    instructions TEXT,
    image_url VARCHAR(500),
    glassware_id BIGINT REFERENCES glassware(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    quantite DECIMAL(10,2) DEFAULT 0,
    quantite_stock DECIMAL(10,2) DEFAULT 0,
    unite_mesure VARCHAR(20) NOT NULL,
    seuil_alerte DECIMAL(10,2),
    fournisseur VARCHAR(100),
    numero_lot VARCHAR(100),
    date_peremption TIMESTAMP,
    prix_unitaire DECIMAL(10,4) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cocktail_ingredients (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id) ON DELETE CASCADE,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    quantite DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cocktail_variantes (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix_supplement DECIMAL(10,2) DEFAULT 0,
    disponible BOOLEAN DEFAULT true,
    multiplicateur_ingredient DECIMAL(10,2) DEFAULT 1.0,
    instructions TEXT,
    recipe_steps_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cocktail_variante_ingredients (
    id BIGSERIAL PRIMARY KEY,
    variante_id BIGINT REFERENCES cocktail_variantes(id) ON DELETE CASCADE,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE CASCADE,
    quantite DECIMAL(10,2) NOT NULL,
    unite VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Recipe Step Templates & Sequential Recipe Steps
CREATE TABLE IF NOT EXISTS recipe_step_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    default_duration_seconds INT DEFAULT 0,
    icon VARCHAR(50),
    description TEXT,
    is_predefined BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cocktail_recipe_steps (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id BIGINT REFERENCES cocktails(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    ingredient_id BIGINT REFERENCES ingredients(id) ON DELETE SET NULL,
    quantite DECIMAL(10,2),
    unite VARCHAR(20),
    template_id BIGINT REFERENCES recipe_step_templates(id) ON DELETE SET NULL,
    action_title VARCHAR(100),
    custom_text TEXT,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Floor Plan, Floors, Zones & Tables
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
    plan_x DOUBLE PRECISION,
    plan_y DOUBLE PRECISION,
    plan_width DOUBLE PRECISION,
    plan_height DOUBLE PRECISION,
    shape_type VARCHAR(20),
    points_json TEXT,
    corner_radii_json VARCHAR(100),
    couleur VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
    id BIGSERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    zone VARCHAR(50) NOT NULL,
    capacite INTEGER NOT NULL,
    occupee BOOLEAN DEFAULT false,
    serveur_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    date_occupation TIMESTAMP,
    date_liberation TIMESTAMP,
    plan_x DOUBLE PRECISION,
    plan_y DOUBLE PRECISION,
    plan_rotation DOUBLE PRECISION DEFAULT 0,
    plan_forme VARCHAR(20) DEFAULT 'CARRE',
    plan_width DOUBLE PRECISION,
    plan_height DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS table_appels (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    commentaire VARCHAR(255),
    acquitte_par VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acquitte_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_table_appels_table_statut ON table_appels(table_id, statut);
CREATE INDEX IF NOT EXISTS idx_table_appels_statut ON table_appels(statut);

-- 5. Orders & Items
CREATE TABLE IF NOT EXISTS commandes (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT REFERENCES tables(id) ON DELETE SET NULL,
    serveur_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    tracking_token VARCHAR(255) UNIQUE,
    statut VARCHAR(20) NOT NULL,
    notes TEXT,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    pourboire DECIMAL(10,2),
    date_commande TIMESTAMP NOT NULL,
    date_preparation TIMESTAMP,
    date_pret TIMESTAMP,
    date_livraison TIMESTAMP,
    date_reglement TIMESTAMP,
    date_modification TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commande_items (
    id BIGSERIAL PRIMARY KEY,
    commande_id BIGINT REFERENCES commandes(id) ON DELETE CASCADE,
    cocktail_id BIGINT REFERENCES cocktails(id) ON DELETE SET NULL,
    cocktail_variante_id BIGINT REFERENCES cocktail_variantes(id) ON DELETE SET NULL,
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    prioritaire BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Billing, Invoices, Items & Credit Notes
CREATE TABLE IF NOT EXISTS factures (
    id BIGSERIAL PRIMARY KEY,
    table_id BIGINT REFERENCES tables(id) ON DELETE SET NULL,
    numero VARCHAR(50) UNIQUE NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    pourboire DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) NOT NULL,
    total_ht DECIMAL(10,2) DEFAULT 0,
    total_vat DECIMAL(10,2) DEFAULT 0,
    reglee BOOLEAN DEFAULT false,
    is_finalized BOOLEAN DEFAULT false,
    finalized_at TIMESTAMP,
    retention_until TIMESTAMP,
    archived_pdf_path VARCHAR(500),
    pdf_hash VARCHAR(64),
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
    facture_id BIGINT REFERENCES factures(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    price_ht DECIMAL(10,2),
    vat_rate VARCHAR(20) DEFAULT 'TWENTY',
    vat_amount DECIMAL(10,2),
    commande_item_id BIGINT REFERENCES commande_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facture_reglements (
    id BIGSERIAL PRIMARY KEY,
    facture_id BIGINT NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    nom_convive VARCHAR(100) NOT NULL,
    part_index INTEGER NOT NULL,
    total_parts INTEGER,
    montant DECIMAL(10,2) NOT NULL,
    pourboire DECIMAL(10,2) DEFAULT 0,
    total_regle DECIMAL(10,2) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL,
    type_split VARCHAR(20) NOT NULL DEFAULT 'EGAL',
    items_json TEXT,
    date_reglement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facture_reglements_facture_id ON facture_reglements(facture_id);

CREATE TABLE IF NOT EXISTS avoirs_credit (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    facture_id BIGINT REFERENCES factures(id) ON DELETE RESTRICT,
    total_ht DECIMAL(10,2) NOT NULL,
    total_vat DECIMAL(10,2) NOT NULL,
    total_ttc DECIMAL(10,2) NOT NULL,
    motif_annulation TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS facture_seq START 1;

-- 7. Audit & Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP NOT NULL
);

-- 8. Global Settings & Legal Establishment Configuration
CREATE TABLE IF NOT EXISTS app_settings (
    id BIGINT PRIMARY KEY,
    primary_color VARCHAR(7) NOT NULL DEFAULT '#6c7fe8',
    primary_color_strong VARCHAR(7) NOT NULL DEFAULT '#5a68d6',
    logo_url VARCHAR(2048),
    establishment_name VARCHAR(100) NOT NULL DEFAULT 'OpenBar',
    default_theme VARCHAR(20) NOT NULL DEFAULT 'DARK',
    currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '€',
    currency_position VARCHAR(10) NOT NULL DEFAULT 'AFTER',
    temps_alerte_warning_minutes INTEGER NOT NULL DEFAULT 3,
    temps_alerte_commande_minutes INTEGER NOT NULL DEFAULT 5,
    temps_alerte_critique_commande_minutes INTEGER NOT NULL DEFAULT 10,
    client_base_url VARCHAR(500) DEFAULT 'https://openbar.lan',
    wifi_ssid VARCHAR(100),
    wifi_password VARCHAR(100),
    wifi_security VARCHAR(20) DEFAULT 'WPA',
    wifi_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS establishment_config (
    id BIGINT PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL DEFAULT 'OpenBar SARL',
    legal_form VARCHAR(50) DEFAULT 'SARL',
    siret VARCHAR(14) DEFAULT '73282932000074',
    rcs_city VARCHAR(100) DEFAULT 'Paris',
    rcs_number VARCHAR(50) DEFAULT 'B 123 456 789',
    tva_number VARCHAR(20) DEFAULT 'FR12123456789',
    code_ape VARCHAR(10) DEFAULT '5630Z',
    capital_social DECIMAL(12,2) DEFAULT 10000.00,
    address VARCHAR(500) DEFAULT '12 Rue du Bar, 75001 Paris',
    country VARCHAR(100) DEFAULT 'France',
    language VARCHAR(10) DEFAULT 'fr',
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

-- 9. Shift Planning, Presets, Closures & Shift Audit
CREATE TABLE IF NOT EXISTS employee_shifts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    date_shift DATE NOT NULL,
    type_shift VARCHAR(20) NOT NULL,
    type_poste VARCHAR(20) NOT NULL,
    heure_debut VARCHAR(10) NOT NULL,
    heure_fin VARCHAR(10) NOT NULL,
    heure_pause_debut VARCHAR(10),
    duree_pause_minutes INTEGER DEFAULT 30,
    heure_debut_reelle VARCHAR(10),
    heure_fin_reelle VARCHAR(10),
    heures_effectuees DECIMAL(5,2) DEFAULT 0,
    heures_sup DECIMAL(5,2) DEFAULT 0,
    heures_prevues DECIMAL(5,2) DEFAULT 8.00,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_presets (
    id BIGSERIAL PRIMARY KEY,
    type_shift VARCHAR(20) NOT NULL UNIQUE,
    nom VARCHAR(50) NOT NULL,
    heure_debut VARCHAR(10) NOT NULL,
    heure_fin VARCHAR(10) NOT NULL,
    duree_pause_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS establishment_closures (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    day_of_week VARCHAR(15),
    closure_date DATE,
    end_date DATE,
    is_annual_recurring BOOLEAN DEFAULT false,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS week_schedule_publications (
    id BIGSERIAL PRIMARY KEY,
    week_start DATE NOT NULL UNIQUE,
    published_at TIMESTAMP NOT NULL,
    published_by VARCHAR(255) NOT NULL,
    snapshot_json TEXT
);

CREATE TABLE IF NOT EXISTS shift_audit_log (
    id BIGSERIAL PRIMARY KEY,
    shift_id BIGINT NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    date_shift DATE,
    action VARCHAR(20) NOT NULL,
    changed_by VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL,
    previous_snapshot TEXT,
    new_snapshot TEXT
);

-- 10. Schema Migrations & Initial Singleton Seeds

INSERT INTO app_settings (
    id,
    primary_color,
    primary_color_strong,
    establishment_name,
    default_theme,
    temps_alerte_warning_minutes,
    temps_alerte_commande_minutes,
    temps_alerte_critique_commande_minutes
)
VALUES (
    1,
    '#6c7fe8',
    '#5a68d6',
    'OpenBar',
    'DARK',
    3,
    5,
    10
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO establishment_config (
    id,
    created_at,
    updated_at
)
VALUES (
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;