# Documentation technique – Application ToDo (Frontend + Backend)

Cette documentation explique le code, les choix techniques, l’architecture générale, ainsi que les paramètres clés, les middlewares, et les endpoints de l’API. Elle couvre aussi les callbacks utilisés côté frontend.

## 1) Vue d’ensemble
- Frontend: React (Create React App), Router, Appwrite pour l’authentification.
- Backend: Cloudflare Workers avec Hono (framework HTTP), base de données Cloudflare D1 (SQL).
- Modèle de données principal: table `items` avec les colonnes `ItemId, Titre, Description, Statut, DateLimite, Priorite, Responsable`.
- Séparation par utilisateur: les tâches sont liées au champ `Responsable` (email ou nom d’utilisateur) afin que chacun voie uniquement ses tâches.

## 2) Choix techniques et justifications
- React 19 + CRA: productivité, écosystème mature, tooling intégré (HMR, lint, tests). Alternative: Vite (plus rapide) – non retenu ici pour la compatibilité CRA existante.
- Appwrite (auth): solution clé-en-main pour la gestion de comptes/sessions sans coder un serveur auth. Alternative: Auth0, Firebase Auth – Appwrite choisi pour simplicité d’intégration et gratuité self-host.
- Hono sur Cloudflare Workers: micro-framework minimaliste, très rapide, adapté à l’edge. Alternative: Express (nécessite runtime Node), non optimal sur Workers.
- Cloudflare D1: base SQL légère, hébergée, proche du worker (latence faible). Alternatives: Supabase (Postgres), Neon – D1 retenu pour simplicité d’exploitation dans l’écosystème Cloudflare.
- Séparation multi-utilisateur par `Responsable`: simple, efficace avec une seule table. Pour une sécurité plus forte, on peut valider un JWT côté backend.

## 3) Backend – Structure et endpoints
Fichier: `testbackend/src/index.js`

### Middlewares
- CORS: autorise le frontend à appeler l’API depuis `http://localhost:3000` et en production. Paramètres: `origin`, `allowHeaders`, `allowMethods`.
- (Option future) Auth par en-tête/JWT: possibilité d’exiger `x-user-id` ou de vérifier un JWT Appwrite pour filtrer côté serveur.

### Endpoints implémentés
- `GET /api/responsables`: retourne la liste des responsables existants.
- `GET /api/items`: version « compat » listant toutes les tâches (utilisée pour debug; préférez la route filtrée).
- `GET /api/items/user/:responsable`: liste des tâches pour un utilisateur donné (filtrage par `Responsable`).
- `GET /api/items/:id`: récupère une tâche par `ItemId` (non filtrée – debug).
- `GET /api/items/user/:responsable/:id`: récupère une tâche par `ItemId` appartenant à `responsable`.
- `POST /api/items`: création (ancienne route). Recommandé: `POST /api/items/user/:responsable`.
- `POST /api/items/user/:responsable`: crée une tâche pour l’utilisateur cible; force `Statut = 'pending'` si omis.
- `PUT /api/items`: mise à jour « compat » (non filtrée).
- `PUT /api/items/user/:responsable/:id`: mise à jour d’une tâche appartenant à `responsable`.
- `DELETE /api/items`: suppression « compat » (non filtrée).
- `DELETE /api/items/user/:responsable/:id`: suppression d’une tâche appartenant à `responsable`.

Notes:
- Les routes « compat » existent pour faciliter le debug. En production, utilisez toujours les routes `.../user/:responsable/...` pour respecter l’isolation par utilisateur.

### Paramètres importants
- `:responsable`: l’identifiant fonctionnel d’un utilisateur (email ou username) utilisé pour filtrer.
- Corps JSON (POST/PUT): `{ Titre, Description, Statut, DateLimite, Priorite }`. Le backend complète `Responsable` (dans les routes user) et des valeurs par défaut si nécessaire.

## 4) Frontend – Structure et logique
Fichiers clés:
- `test/src/pages/TodoList.js`: composant principal de la ToDo
- `test/src/services/api.js`: couche d’accès HTTP à l’API
- `test/src/config/api.js`: configuration de l’URL de base (prod Workers)
- `test/src/appwrite/config.js`: initialisation Appwrite (`account`)

### Authentification (Appwrite)
- À l’ouverture de `TodoList`, on appelle `account.get()` pour récupérer l’utilisateur courant.
- Si non connecté, redirection vers la page Login (gérée ailleurs dans l’app).

### Chargement des tâches – callbacks principaux
- `initializeApp` (useEffect):
  1) Récupère l’utilisateur (`account.get()`)
  2) Appelle `loadTodos(currentUser)`
- `loadTodos(currentUser)`: construit `responsable = currentUser.email || currentUser.name`, appelle `apiService.getUserItems(responsable)`, puis met à jour `todos`.

### Ajout, édition, suppression
- `addTodo`: prépare un objet `{ Titre, Statut: 'pending', Priorite: 'moyenne', Responsable: user.email }` et appelle `apiService.createUserItem(responsable, data)`, puis recharge.
- `toggleTodo`: bascule `Statut` entre `pending` et `completed`, via `apiService.updateUserItem(responsable, id, payload)`.
- `saveEdit`: met à jour uniquement le `Titre` via `apiService.updateUserItem(...)`.
- `deleteTodo`: supprime via `apiService.deleteUserItem(responsable, id)`.

### Gestion des états
- `loading`/`error`: indicateurs d’UI pendant les appels réseau; messages d’erreur affichés au-dessus de la liste.

## 5) Service API (frontend)
Fichier: `test/src/services/api.js`

### Méthodes
- Génériques: `request(endpoint, options)` gère fetch + parsing JSON + erreurs HTTP.
- Lecture/écriture filtrées par utilisateur:
  - `getUserItems(responsable)` → `GET /api/items/user/:responsable`
  - `createUserItem(responsable, data)` → `POST /api/items/user/:responsable`
  - `updateUserItem(responsable, id, data)` → `PUT /api/items/user/:responsable/:id`
  - `deleteUserItem(responsable, id)` → `DELETE /api/items/user/:responsable/:id`

Ces méthodes garantissent que toute opération passe par un endpoint scoping « user ».

## 6) Sécurité et multi‑tenant
- Niveau actuel: filtrage par champ `Responsable` transmis depuis le frontend (email utilisateur). Cela isole fonctionnellement l’UI entre utilisateurs.
- Renforcement recommandé: valider côté backend un JWT Appwrite (via une route de validation ou un service binding) et extraire l’identifiant utilisateur côté serveur pour éviter la falsification. On pourrait:
  - Exiger un header `Authorization: Bearer <JWT>`
  - Vérifier le JWT et setter `userId` dans le contexte
  - Retirer `:responsable` des URLs et utiliser `userId` serveur pour toutes les requêtes

## 7) Schéma SQL
Extrait de `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS items (
    ItemId INTEGER PRIMARY KEY AUTOINCREMENT,
    Titre TEXT NOT NULL,
    Description TEXT,
    Statut TEXT DEFAULT 'pending', 
    DateLimite DATE,
    Priorite TEXT DEFAULT 'moyenne',
    Responsable TEXT
);
```

## 8) Flux typique (callback/middleware/endpoints)
1) L’utilisateur ouvre l’app → `account.get()` (callback) → user chargé
2) `loadTodos(user)` → `GET /api/items/user/:responsable` (endpoint)
3) `addTodo()` → `POST /api/items/user/:responsable` (endpoint) → rechargement
4) `toggleTodo()`/`saveEdit()` → `PUT /api/items/user/:responsable/:id` (endpoint)
5) `deleteTodo()` → `DELETE /api/items/user/:responsable/:id` (endpoint)
6) CORS middleware autorise l’origine, méthodes, headers

## 9) Paramètres et valeurs par défaut
- `Statut`: `pending | in_progress | completed` (par défaut: `pending`)
- `Priorite`: `basse | moyenne | haute` (par défaut: `moyenne`)
- `Responsable`: email ou username; déterminé côté frontend via Appwrite
- `DateLimite`: `YYYY-MM-DD` ou `null`

## 10) Limitations et évolutions
- Routes « compat » ouvertes: à restreindre/supprimer en production.
- Sécurité: ajouter une validation JWT côté backend pour empêcher l’usurpation de `Responsable`.
- Recherche, filtrage avancé, pagination: faciles à ajouter via requêtes SQL.
- Tests: ajouter des tests e2e (Playwright) et unitaires (Vitest) côté backend.

---
Cette documentation doit suffire pour maintenir, faire évoluer, et auditer l’application. Pour activer la vérification JWT côté backend, dites‑le moi et je fournis les edits nécessaires (middleware + mise à jour du service API).
