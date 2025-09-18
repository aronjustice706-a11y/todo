# Guide d'intégration Frontend-Backend

## Vue d'ensemble

Ce guide explique comment intégrer le frontend React avec le backend Cloudflare Workers pour votre application ToDo.

## Structure du projet

```
ToDo/
├── test/                    # Frontend React
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js       # Service API pour communiquer avec le backend
│   │   ├── config/
│   │   │   └── api.js       # Configuration de l'API
│   │   └── pages/
│   │       └── TodoList.js  # Composant principal modifié
└── testbackend/             # Backend Cloudflare Workers
    ├── src/
    │   └── index.js         # API REST avec Hono
    └── wrangler.jsonc       # Configuration Cloudflare
```

## Étapes d'intégration

### 1. Déployer le backend

1. Naviguez vers le dossier `testbackend` :
   ```bash
   cd testbackend
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Déployez sur Cloudflare Workers :
   ```bash
   npm run deploy
   ```

4. Notez l'URL de déploiement qui s'affiche (ex: `https://testbackend.sop-tech.workers.dev`)

### 2. Configurer le frontend

1. Ouvrez le fichier `test/src/config/api.js`

2. Remplacez l'URL par défaut par votre vraie URL de déploiement :
   ```javascript
   export const API_CONFIG = {
     BASE_URL: 'https://VOTRE-URL-DEPLOYEE.workers.dev', // Remplacez ici
     // ...
   };
   ```

### 3. Tester l'intégration

1. Naviguez vers le dossier `test` :
   ```bash
   cd test
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Démarrez l'application :
   ```bash
   npm start
   ```

4. Ouvrez votre navigateur sur `http://localhost:3000`

## Fonctionnalités intégrées

### Modèle de données
Le frontend utilise maintenant le même modèle que la base de données :
- `ItemId` : ID unique (auto-incrémenté)
- `Titre` : Titre de la tâche
- `Description` : Description détaillée
- `Statut` : pending, in_progress, completed
- `DateLimite` : Date d'échéance
- `Priorite` : basse, moyenne, haute
- `Responsable` : Personne responsable

### API Endpoints utilisés
- `GET /api/items` : Récupérer toutes les tâches
- `GET /api/items/:id` : Récupérer une tâche spécifique
- `POST /api/items` : Créer une nouvelle tâche
- `PUT /api/items/:id` : Mettre à jour une tâche
- `DELETE /api/items/:id` : Supprimer une tâche

### Fonctionnalités du frontend
- ✅ Affichage de toutes les tâches depuis la base de données
- ✅ Création de nouvelles tâches avec tous les champs
- ✅ Modification des tâches existantes
- ✅ Suppression des tâches
- ✅ Changement de statut (checkbox)
- ✅ Gestion des erreurs et états de chargement
- ✅ Interface utilisateur améliorée avec tous les champs

## Dépannage

### Erreur CORS
Si vous rencontrez des erreurs CORS, ajoutez les headers CORS dans votre backend :

```javascript
// Dans testbackend/src/index.js
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  await next();
});
```

### Erreur de connexion
1. Vérifiez que l'URL dans `config/api.js` est correcte
2. Vérifiez que le backend est bien déployé
3. Testez l'API directement dans le navigateur : `https://votre-url.workers.dev/api/items`

### Base de données vide
Si la base de données est vide, vous pouvez ajouter des données de test via l'interface ou directement dans la base de données Cloudflare D1.

## Prochaines étapes

1. **Authentification** : Intégrer l'authentification Appwrite avec les tâches
2. **Filtres** : Ajouter des filtres par statut, priorité, responsable
3. **Recherche** : Implémenter une fonction de recherche
4. **Notifications** : Ajouter des notifications pour les tâches en retard
5. **Responsive** : Améliorer l'interface mobile
