import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Middleware CORS pour permettre les requêtes depuis le frontend
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// GET /api/responsables - Récupérer la liste de tous les responsables (utilise maintenant l'ID Appwrite)
app.get('/api/responsables', async (c) => {
  const query = await c.env.prod_testbackend
    .prepare("SELECT DISTINCT Responsable FROM items ORDER BY Responsable")
    .all()
  
  const responsables = query.results?.map(row => row.Responsable) || []
  return c.json({ 
    message: "success", 
    data: responsables 
  })
})

// GET /api/items - Récupérer toutes les tâches (ancien endpoint pour compatibilité)
app.get('/api/items', async (c) => {
  const query = await c.env.prod_testbackend
    .prepare("SELECT * FROM items ORDER BY DateLimite ASC")
    .all()
  return c.json(query.results ?? [])
})

// GET /api/items/user/:responsable - Récupérer les tâches d'un utilisateur spécifique (compatible ancien/nouveau schéma)
app.get('/api/items/user/:responsable', async (c) => {
  try {
    console.log('=== DÉBUT GET /api/items/user/:responsable ===')
    
    const responsable = decodeURIComponent(c.req.param('responsable'))
    console.log('Chargement des tâches pour le responsable (ID Appwrite):', responsable)
    
    // D'abord vérifier la structure de la table
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    console.log('Schéma de la table:', schemaQuery.results)
    
    const hasResponsable = schemaQuery.results?.some(col => col.name === 'Responsable')
    const hasUserId = schemaQuery.results?.some(col => col.name === 'UserId')
    
    console.log('Vérification du schéma - hasResponsable:', hasResponsable, 'hasUserId:', hasUserId)
    
    let query;
    
    if (hasResponsable) {
      // Ancien schéma avec colonne Responsable
      console.log('Utilisation de l\'ancien schéma avec la colonne Responsable')
      query = await c.env.prod_testbackend
        .prepare("SELECT * FROM items WHERE Responsable = ? ORDER BY DateLimite ASC")
        .bind(responsable)
        .all()
    } else if (hasUserId) {
      // Nouveau schéma avec colonne UserId
      console.log('Utilisation du nouveau schéma avec la colonne UserId')
      query = await c.env.prod_testbackend
        .prepare("SELECT * FROM items WHERE UserId = ? ORDER BY DateLimite ASC")
        .bind(responsable)
        .all()
    } else {
      // Aucun schéma reconnu
      console.error('Aucun schéma reconnu trouvé')
      return c.json({ 
        error: "Structure de base de données non reconnue",
        details: "Colonnes disponibles: " + schemaQuery.results?.map(col => col.name).join(', ')
      }, 500)
    }
    
    console.log('Trouvé', query.results?.length || 0, 'tâches pour le responsable:', responsable)
    
    return c.json({
      message: "success",
      data: query.results ?? [],
      responsable: responsable,
      count: query.results?.length ?? 0,
      schema: hasResponsable ? 'old' : 'new'
    })
  } catch (error) {
    console.error('Erreur dans GET /api/items/user/:responsable:', error)
    return c.json({ 
      error: "Erreur lors de la récupération des tâches",
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== FIN GET /api/items/user/:responsable ===')
  }
})

// GET /api/items/:id - Récupérer une tâche spécifique (sans filtre utilisateur pour l'instant)
app.get('/api/items/:id', async (c) => {
  const id = c.req.param('id')
  const query = await c.env.prod_testbackend
    .prepare("SELECT * FROM items WHERE ItemId = ?")
    .bind(id)
    .first()
    
  if (!query) {
    return c.json({ error: "Tâche non trouvée" }, 404)
  }
    
  return c.json(query)
})

// GET /api/items/user/:responsable/:id - Récupérer une tâche spécifique d'un utilisateur
app.get('/api/items/user/:responsable/:id', async (c) => {
  const responsable = decodeURIComponent(c.req.param('responsable'))
  const id = c.req.param('id')
  
  const query = await c.env.prod_testbackend
    .prepare("SELECT * FROM items WHERE ItemId = ? AND Responsable = ?")
    .bind(id, responsable)
    .first()
    
  if (!query) {
    return c.json({ error: "Tâche non trouvée ou vous n'êtes pas le responsable" }, 404)
  }
    
  return c.json(query)
})

// POST /api/items - Créer une nouvelle tâche (ancien endpoint)
app.post('/api/items', async (c) => {
  const body = await c.req.json()
  const { Titre, Description, Statut, DateLimite, Priorite, Responsable } = body

  const result = await c.env.prod_testbackend
    .prepare(`INSERT INTO items (Titre, Description, Statut, DateLimite, Priorite, Responsable)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(Titre, Description, Statut || 'pending', DateLimite, Priorite || 'moyenne', Responsable)
    .run()

  return c.json({ 
    message: "Tâche ajoutée avec succès", 
    itemId: result.meta.last_row_id 
  }, 201)
})

// POST /api/items/user/:responsable - Créer une nouvelle tâche pour un utilisateur spécifique (compatible ancien/nouveau schéma)
app.post('/api/items/user/:responsable', async (c) => {
  try {
    console.log('=== DÉBUT POST /api/items/user/:responsable ===')
    
    const responsable = decodeURIComponent(c.req.param('responsable'))
    console.log('Responsable (ID Appwrite) depuis le paramètre:', responsable)
    
    const body = await c.req.json()
    console.log('Corps de la requête:', body)
    
    const { Titre, Description, DateLimite, Priorite } = body
    
    // Validation basique
    if (!Titre || !Titre.trim()) {
      console.log('Validation échouée: Le titre est requis')
      return c.json({ error: "Le titre est requis" }, 400)
    }

    // Vérifier la structure de la table
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    const hasResponsable = schemaQuery.results?.some(col => col.name === 'Responsable')
    const hasUserId = schemaQuery.results?.some(col => col.name === 'UserId')
    
    console.log('Vérification du schéma - hasResponsable:', hasResponsable, 'hasUserId:', hasUserId)

 let result;
    
    if (hasResponsable) {
      // Ancien schéma avec colonne Responsable
      console.log('Création de la tâche avec l\'ancien schéma (colonne Responsable)')
      result = await c.env.prod_testbackend
        .prepare(`INSERT INTO items (Titre, Description, Statut, DateLimite, Priorite, Responsable)
                  VALUES (?, ?, 'pending', ?, ?, ?)`)
        .bind(Titre.trim(), Description || '', DateLimite || null, Priorite || 'moyenne', responsable)
        .run()
    } else if (hasUserId) {
      // Nouveau schéma avec colonne UserId
      console.log('Création de la tâche avec le nouveau schéma (colonne UserId)')
      result = await c.env.prod_testbackend
        .prepare(`INSERT INTO items (Titre, Description, Statut, DateLimite, Priorite, UserId, UserEmail)
                  VALUES (?, ?, 'pending', ?, ?, ?, ?)`)
        .bind(Titre.trim(), Description || '', DateLimite || null, Priorite || 'moyenne', responsable, responsable)
        .run()
    } else {
      console.error('Aucun schéma reconnu trouvé')
      return c.json({ 
        error: "Structure de base de données non reconnue",
        details: "Colonnes disponibles: " + schemaQuery.results?.map(col => col.name).join(', ')
      }, 500)
    }

    console.log('Tâche créée avec succès, ID:', result.meta.last_row_id)

    return c.json({ 
      message: "Tâche ajoutée avec succès", 
      data: {
        itemId: result.meta.last_row_id,
        Titre: Titre.trim(),
        Description: Description || '',
        Statut: 'pending',
        DateLimite: DateLimite || null,
        Priorite: Priorite || 'moyenne',
        Responsable: responsable,  // ID Appwrite
        AppwriteId: responsable,   // Alias pour clarifier que c'est l'ID Appwrite
        schema: hasResponsable ? 'old' : 'new'
      }
    }, 201)
  } catch (error) {
    console.error('Erreur dans POST /api/items/user/:responsable:', error)
    return c.json({ 
      error: "Erreur lors de la création de la tâche",
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== FIN POST /api/items/user/:responsable ===')
  }
})

// PUT /api/items/:id - Mettre à jour une tâche (ancien endpoint)
app.put('/api/items/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { Titre, Description, Statut, DateLimite, Priorite, Responsable } = body

  const result = await c.env.prod_testbackend
    .prepare(`UPDATE items SET Titre = ?, Description = ?, Statut = ?, DateLimite = ?, Priorite = ?, Responsable = ?
              WHERE ItemId = ?`)
    .bind(Titre, Description, Statut, DateLimite, Priorite, Responsable, id)
    .run()

  if (result.changes === 0) {
    return c.json({ error: "Tâche non trouvée" }, 404)
  }

  return c.json({ message: "Tâche mise à jour avec succès" }, 200)
})

// PUT /api/items/user/:responsable/:id - Mettre à jour une tâche d'un utilisateur spécifique (compatible ancien/nouveau schéma)
app.put('/api/items/user/:responsable/:id', async (c) => {
  try {
    console.log('=== DÉBUT PUT /api/items/user/:responsable/:id ===')
    
    const responsable = decodeURIComponent(c.req.param('responsable'))
    const id = c.req.param('id')
    const body = await c.req.json()
    const { Titre, Description, Statut, DateLimite, Priorite } = body

    console.log('Mise à jour de la tâche pour le responsable (ID Appwrite):', responsable, 'ID de la tâche:', id)

    // Vérifier la structure de la table
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    const hasResponsable = schemaQuery.results?.some(col => col.name === 'Responsable')
    const hasUserId = schemaQuery.results?.some(col => col.name === 'UserId')
    
    console.log('Vérification du schéma - hasResponsable:', hasResponsable, 'hasUserId:', hasUserId)

    let result;
    
    if (hasResponsable) {
      // Ancien schéma avec colonne Responsable
      console.log('Mise à jour de la tâche avec l\'ancien schéma (colonne Responsable)')
      result = await c.env.prod_testbackend
        .prepare(`UPDATE items SET Titre = ?, Description = ?, Statut = ?, DateLimite = ?, Priorite = ?
                  WHERE ItemId = ? AND Responsable = ?`)
        .bind(Titre, Description, Statut, DateLimite, Priorite, id, responsable)
        .run()
    } else if (hasUserId) {
      // Nouveau schéma avec colonne UserId
      console.log('Mise à jour de la tâche avec le nouveau schéma (colonne UserId)')
      result = await c.env.prod_testbackend
        .prepare(`UPDATE items SET Titre = ?, Description = ?, Statut = ?, DateLimite = ?, Priorite = ?
                  WHERE ItemId = ? AND UserId = ?`)
        .bind(Titre, Description, Statut, DateLimite, Priorite, id, responsable)
        .run()
    } else {
      console.error('Aucun schéma reconnu trouvé')
      return c.json({ 
        error: "Structure de base de données non reconnue",
        details: "Colonnes disponibles: " + schemaQuery.results?.map(col => col.name).join(', ')
      }, 500)
    }

    if (result.changes === 0) {
      return c.json({ error: "Tâche non trouvée ou vous n'êtes pas le responsable" }, 404)
    }

    return c.json({ message: "Tâche mise à jour avec succès" })
  } catch (error) {
    console.error('Erreur dans PUT /api/items/user/:responsable/:id:', error)
    return c.json({ 
      error: "Erreur lors de la mise à jour de la tâche",
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== FIN PUT /api/items/user/:responsable/:id ===')
  }
})

// DELETE /api/items/:id - Supprimer une tâche (ancien endpoint)
app.delete('/api/items/:id', async (c) => {
  const id = c.req.param('id')

  const result = await c.env.prod_testbackend
    .prepare("DELETE FROM items WHERE ItemId = ?")
    .bind(id)
    .run()

  if (result.changes === 0) {
    return c.json({ error: "Tâche non trouvée" }, 404)
  }

  return c.json({ message: "Tâche supprimée avec succès" })
})

// DELETE /api/items/user/:responsable/:id - Supprimer une tâche d'un utilisateur spécifique (compatible ancien/nouveau schéma)
app.delete('/api/items/user/:responsable/:id', async (c) => {
  try {
    console.log('=== DÉBUT DELETE /api/items/user/:responsable/:id ===')
    
    const responsable = decodeURIComponent(c.req.param('responsable'))
    const id = c.req.param('id')

    console.log('Suppression de la tâche pour le responsable (ID Appwrite):', responsable, 'ID de la tâche:', id)

    // Vérifier la structure de la table
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    const hasResponsable = schemaQuery.results?.some(col => col.name === 'Responsable')
    const hasUserId = schemaQuery.results?.some(col => col.name === 'UserId')
    
    console.log('Vérification du schéma - hasResponsable:', hasResponsable, 'hasUserId:', hasUserId)

    let result;
    
    if (hasResponsable) {
      // Ancien schéma avec colonne Responsable
      console.log('Suppression de la tâche avec l\'ancien schéma (colonne Responsable)')
      result = await c.env.prod_testbackend
        .prepare("DELETE FROM items WHERE ItemId = ? AND Responsable = ?")
        .bind(id, responsable)
        .run()
    } else if (hasUserId) {
      // Nouveau schéma avec colonne UserId
      console.log('Suppression de la tâche avec le nouveau schéma (colonne UserId)')
      result = await c.env.prod_testbackend
        .prepare("DELETE FROM items WHERE ItemId = ? AND UserId = ?")
        .bind(id, responsable)
        .run()
    } else {
      console.error('Aucun schéma reconnu trouvé')
      return c.json({ 
        error: "Structure de base de données non reconnue",
        details: "Colonnes disponibles: " + schemaQuery.results?.map(col => col.name).join(', ')
      }, 500)
    }

    if (result.changes === 0) {
      return c.json({ error: "Tâche non trouvée ou vous n'êtes pas le responsable" }, 404)
    }

    return c.json({ message: "Tâche supprimée avec succès" })
  } catch (error) {
    console.error('Erreur dans DELETE /api/items/user/:responsable/:id:', error)
    return c.json({ 
      error: "Erreur lors de la suppression de la tâche",
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== FIN DELETE /api/items/user/:responsable/:id ===')
  }
})

// GET /api/debug/schema - Diagnostic complet de la structure de la base
app.get('/api/debug/schema', async (c) => {
  try {
    console.log('=== DÉBUT DIAGNOSTIC SCHÉMA ===')
    
    // Vérifier la structure de la table items
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    console.log('Schéma de la table items:', schemaQuery.results)
    
    // Vérifier les données existantes
    const sampleQuery = await c.env.prod_testbackend
      .prepare("SELECT * FROM items LIMIT 3")
      .all()
    
    console.log('Données d\'exemple:', sampleQuery.results)
    
    // Vérifier toutes les tables
    const tablesQuery = await c.env.prod_testbackend
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
    
    console.log('Toutes les tables:', tablesQuery.results)
    
    const result = {
      message: "Diagnostic du schéma terminé",
      timestamp: new Date().toISOString(),
      itemsSchema: schemaQuery.results || [],
      sampleData: sampleQuery.results || [],
      allTables: tablesQuery.results || [],
      hasResponsable: schemaQuery.results?.some(col => col.name === 'Responsable') || false,
      hasUserId: schemaQuery.results?.some(col => col.name === 'UserId') || false,
      hasUserEmail: schemaQuery.results?.some(col => col.name === 'UserEmail') || false,
      columnNames: schemaQuery.results?.map(col => col.name) || []
    }
    
    console.log('Résultat du diagnostic:', result)
    return c.json(result)
  } catch (error) {
    console.error('Échec du diagnostic du schéma:', error)
    return c.json({ 
      error: "Échec du diagnostic du schéma", 
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== FIN DIAGNOSTIC SCHÉMA ===')
  }
})

// Route par défaut
app.get('/', (c) => {
  return c.json({
    message: "Bienvenue sur l'API ToDo",
    endpoints: {
      "GET /api/health": "Test de santé de l'API",
      "GET /api/responsables": "Liste des responsables",
      "GET /api/items/user/:responsable": "Tâches d'un utilisateur",
      "POST /api/items/user/:responsable": "Créer une tâche pour un utilisateur",
      "PUT /api/items/user/:responsable/:id": "Modifier une tâche",
      "DELETE /api/items/user/:responsable/:id": "Supprimer une tâche"
    }
  })
})

export default app;