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
    console.log('=== GET /api/items/user/:responsable START ===')
    
    const responsable = decodeURIComponent(c.req.param('responsable'))
    console.log('Loading tasks for responsable (Appwrite ID):', responsable)
    
    // D'abord vérifier la structure de la table
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    console.log('Table schema:', schemaQuery.results)
    
    const hasResponsable = schemaQuery.results?.some(col => col.name === 'Responsable')
    const hasUserId = schemaQuery.results?.some(col => col.name === 'UserId')
    
    console.log('Schema check - hasResponsable:', hasResponsable, 'hasUserId:', hasUserId)
    
    let query;
    
    if (hasResponsable) {
      // Ancien schéma avec colonne Responsable
      console.log('Using old schema with Responsable column')
      query = await c.env.prod_testbackend
        .prepare("SELECT * FROM items WHERE Responsable = ? ORDER BY DateLimite ASC")
        .bind(responsable)
        .all()
    } else if (hasUserId) {
      // Nouveau schéma avec colonne UserId
      console.log('Using new schema with UserId column')
      query = await c.env.prod_testbackend
        .prepare("SELECT * FROM items WHERE UserId = ? ORDER BY DateLimite ASC")
        .bind(responsable)
        .all()
    } else {
      // Aucun schéma reconnu
      console.error('No recognized schema found')
      return c.json({ 
        error: "Structure de base de données non reconnue",
        details: "Colonnes disponibles: " + schemaQuery.results?.map(col => col.name).join(', ')
      }, 500)
    }
    
    console.log('Found', query.results?.length || 0, 'tasks for responsable:', responsable)
    
    return c.json({
      message: "success",
      data: query.results ?? [],
      responsable: responsable,
      count: query.results?.length ?? 0,
      schema: hasResponsable ? 'old' : 'new'
    })
  } catch (error) {
    console.error('Error in GET /api/items/user/:responsable:', error)
    return c.json({ 
      error: "Erreur lors de la récupération des tâches",
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== GET /api/items/user/:responsable END ===')
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
    console.log('=== POST /api/items/user/:responsable START ===')
    
    const responsable = decodeURIComponent(c.req.param('responsable'))
    console.log('Responsable (Appwrite ID) from param:', responsable)
    
    const body = await c.req.json()
    console.log('Request body:', body)
    
    const { Titre, Description, DateLimite, Priorite } = body
    
    // Validation basique
    if (!Titre || !Titre.trim()) {
      console.log('Validation failed: Titre is required')
      return c.json({ error: "Le titre est requis" }, 400)
    }

    // Vérifier la structure de la table
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    const hasResponsable = schemaQuery.results?.some(col => col.name === 'Responsable')
    const hasUserId = schemaQuery.results?.some(col => col.name === 'UserId')
    
    console.log('Schema check - hasResponsable:', hasResponsable, 'hasUserId:', hasUserId)

    let result;
    
    if (hasResponsable) {
      // Ancien schéma avec colonne Responsable
      console.log('Creating task with old schema (Responsable column)')
      result = await c.env.prod_testbackend
        .prepare(`INSERT INTO items (Titre, Description, Statut, DateLimite, Priorite, Responsable)
                  VALUES (?, ?, 'pending', ?, ?, ?)`)
        .bind(Titre.trim(), Description || '', DateLimite || null, Priorite || 'moyenne', responsable)
        .run()
    } else if (hasUserId) {
      // Nouveau schéma avec colonne UserId
      console.log('Creating task with new schema (UserId column)')
      result = await c.env.prod_testbackend
        .prepare(`INSERT INTO items (Titre, Description, Statut, DateLimite, Priorite, UserId, UserEmail)
                  VALUES (?, ?, 'pending', ?, ?, ?, ?)`)
        .bind(Titre.trim(), Description || '', DateLimite || null, Priorite || 'moyenne', responsable, responsable)
        .run()
    } else {
      console.error('No recognized schema found')
      return c.json({ 
        error: "Structure de base de données non reconnue",
        details: "Colonnes disponibles: " + schemaQuery.results?.map(col => col.name).join(', ')
      }, 500)
    }

    console.log('Task created successfully, ID:', result.meta.last_row_id)

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
    console.error('Error in POST /api/items/user/:responsable:', error)
    return c.json({ 
      error: "Erreur lors de la création de la tâche",
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== POST /api/items/user/:responsable END ===')
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

// PUT /api/items/user/:responsable/:id - Mettre à jour une tâche d'un utilisateur spécifique (utilise l'ID Appwrite)
app.put('/api/items/user/:responsable/:id', async (c) => {
  const responsable = decodeURIComponent(c.req.param('responsable'))
  const id = c.req.param('id')
  const body = await c.req.json()
  const { Titre, Description, Statut, DateLimite, Priorite } = body

  console.log('Updating task for responsable (Appwrite ID):', responsable, 'task ID:', id)

  const result = await c.env.prod_testbackend
    .prepare(`UPDATE items SET Titre = ?, Description = ?, Statut = ?, DateLimite = ?, Priorite = ?
              WHERE ItemId = ? AND Responsable = ?`)
    .bind(Titre, Description, Statut, DateLimite, Priorite, id, responsable)
    .run()

  if (result.changes === 0) {
    return c.json({ error: "Tâche non trouvée ou vous n'êtes pas le responsable" }, 404)
  }

  return c.json({ message: "Tâche mise à jour avec succès" })
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

// DELETE /api/items/user/:responsable/:id - Supprimer une tâche d'un utilisateur spécifique (utilise l'ID Appwrite)
app.delete('/api/items/user/:responsable/:id', async (c) => {
  const responsable = decodeURIComponent(c.req.param('responsable'))
  const id = c.req.param('id')

  console.log('Deleting task for responsable (Appwrite ID):', responsable, 'task ID:', id)

  const result = await c.env.prod_testbackend
    .prepare("DELETE FROM items WHERE ItemId = ? AND Responsable = ?")
    .bind(id, responsable)
    .run()

  if (result.changes === 0) {
    return c.json({ error: "Tâche non trouvée ou vous n'êtes pas le responsable" }, 404)
  }

  return c.json({ message: "Tâche supprimée avec succès" })
})

// GET /api/debug/schema - Diagnostic complet de la structure de la base
app.get('/api/debug/schema', async (c) => {
  try {
    console.log('=== SCHEMA DIAGNOSTIC START ===')
    
    // Vérifier la structure de la table items
    const schemaQuery = await c.env.prod_testbackend
      .prepare("PRAGMA table_info(items)")
      .all()
    
    console.log('Items table schema:', schemaQuery.results)
    
    // Vérifier les données existantes
    const sampleQuery = await c.env.prod_testbackend
      .prepare("SELECT * FROM items LIMIT 3")
      .all()
    
    console.log('Sample data:', sampleQuery.results)
    
    // Vérifier toutes les tables
    const tablesQuery = await c.env.prod_testbackend
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
    
    console.log('All tables:', tablesQuery.results)
    
    const result = {
      message: "Schema diagnostic completed",
      timestamp: new Date().toISOString(),
      itemsSchema: schemaQuery.results || [],
      sampleData: sampleQuery.results || [],
      allTables: tablesQuery.results || [],
      hasResponsable: schemaQuery.results?.some(col => col.name === 'Responsable') || false,
      hasUserId: schemaQuery.results?.some(col => col.name === 'UserId') || false,
      hasUserEmail: schemaQuery.results?.some(col => col.name === 'UserEmail') || false,
      columnNames: schemaQuery.results?.map(col => col.name) || []
    }
    
    console.log('Diagnostic result:', result)
    return c.json(result)
  } catch (error) {
    console.error('Schema diagnostic failed:', error)
    return c.json({ 
      error: "Schema diagnostic failed", 
      details: error.message,
      stack: error.stack
    }, 500)
  } finally {
    console.log('=== SCHEMA DIAGNOSTIC END ===')
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

export default app