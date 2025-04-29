-- Insertion des rôles utilisateurs
INSERT INTO user_roles (user_id, roles) VALUES
(1, 'ADMIN'),
(2, 'SERVEUR'),
(3, 'BARMEN');

-- Insertion des utilisateurs (mot de passe: 'password' encodé avec BCrypt)
INSERT INTO users (username, password, email, nom, prenom, created_at, updated_at) VALUES
('admin', '$2a$10$rDkPvvAFV6GgJjXpYWxqUOQZx5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'admin@bar.com', 'Admin', 'System', NOW(), NOW()),
('serveur1', '$2a$10$rDkPvvAFV6GgJjXpYWxqUOQZx5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'serveur1@bar.com', 'Dupont', 'Jean', NOW(), NOW()),
('barmen1', '$2a$10$rDkPvvAFV6GgJjXpYWxqUOQZx5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'barmen1@bar.com', 'Martin', 'Pierre', NOW(), NOW());

-- Insertion des catégories de cocktails
INSERT INTO cocktails (nom, description, prix, categorie, disponible, created_at, updated_at) VALUES
('Mojito', 'Cocktail rafraîchissant à base de rhum, menthe et citron vert', 12.00, 'CLASSIQUE', true, NOW(), NOW()),
('Margarita', 'Cocktail mexicain à base de tequila, triple sec et citron vert', 13.00, 'CLASSIQUE', true, NOW(), NOW()),
('Cosmopolitan', 'Cocktail élégant à base de vodka, triple sec et canneberge', 14.00, 'SIGNATURE', true, NOW(), NOW());

-- Insertion des ingrédients
INSERT INTO ingredients (nom, quantite, unite_mesure, seuil_alerte, fournisseur, created_at, updated_at) VALUES
('Rhum blanc', 5.00, 'LITRE', 1.00, 'Havana Club', NOW(), NOW()),
('Tequila', 3.00, 'LITRE', 0.50, 'Jose Cuervo', NOW(), NOW()),
('Vodka', 4.00, 'LITRE', 1.00, 'Absolut', NOW(), NOW()),
('Triple sec', 2.00, 'LITRE', 0.50, 'Cointreau', NOW(), NOW()),
('Citron vert', 50.00, 'UNITE', 10.00, 'Fruits & Légumes', NOW(), NOW()),
('Menthe fraîche', 100.00, 'GRAMME', 20.00, 'Herbes & Épices', NOW(), NOW()),
('Jus de canneberge', 2.00, 'LITRE', 0.50, 'Jus & Boissons', NOW(), NOW());

-- Insertion des tables
INSERT INTO tables (numero, zone, capacite, occupee, created_at, updated_at) VALUES
(1, 'TERRASSE', 4, false, NOW(), NOW()),
(2, 'TERRASSE', 2, false, NOW(), NOW()),
(3, 'SALLE', 6, false, NOW(), NOW()),
(4, 'SALLE', 4, false, NOW(), NOW()),
(5, 'BAR', 2, false, NOW(), NOW()); 