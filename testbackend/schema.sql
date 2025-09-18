DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    UserId INTEGER PRIMARY KEY AUTOINCREMENT,
    ExternalId TEXT UNIQUE,          -- ID externe (ex: Appwrite user.$id)
    Username TEXT,
    Email TEXT UNIQUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    Password TEXT NOT NULL
);


DROP TABLE IF EXISTS items;

CREATE TABLE IF NOT EXISTS items (
    ItemId INTEGER PRIMARY KEY AUTOINCREMENT,
    Titre TEXT NOT NULL,
    Description TEXT,
    Statut TEXT DEFAULT 'en attente',
    DateLimite DATE,
    Priorite TEXT DEFAULT 'moyenne',
    Responsable TEXT
);

-- Index utile pour filtrer par utilisateur
CREATE INDEX IF NOT EXISTS idx_items_responsable ON items(Responsable);

-- Données de test
INSERT INTO users (ExternalId, Username, Email, Password) VALUES
('appwrite_jean', 'jean.dupont', 'jean.dupont@email.com', '12345'),
('appwrite_marie', 'marie.martin', 'marie.martin@email.com', '12346'),
('appwrite_pierre', 'pierre.durand', 'pierre.durand@email.com', '12347'),
('appwrite_sophie', 'sophie.bernard', 'sophie.bernard@email.com', '12348');


INSERT INTO items (Titre, Description, Statut, DateLimite, Priorite, Responsable) VALUES
('Acheter du matériel', 'Commander les routeurs et câbles pour le réseau', 'pending', '2025-09-15', 'haute', 'appwrite_jean'),
('Configurer le routeur', 'Installation et configuration du routeur principal', 'in_progress', '2025-09-16', 'haute', 'appwrite_marie'),
('Installer les points d''accès', 'Déployer les répéteurs dans les bureaux', 'pending', '2025-09-17', 'moyenne', 'appwrite_pierre'),
('Tester la connexion', 'Vérifier la stabilité et la bande passante', 'pending', '2025-09-18', 'basse', 'appwrite_sophie');