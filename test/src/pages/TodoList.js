import React, { useState, useEffect } from "react";
import { account } from "../appwrite/config";
import { apiService } from "../services/api";
import "./TodoList.css";

const TodoList = ({ onLogout }) => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState({
    Titre: "",
    Description: "",
    Statut: "pending",
    DateLimite: "",
    Priorite: "moyenne",
    Responsable: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get current user and load todos
    const initializeApp = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        await loadTodos(currentUser);
      } catch (error) {
        console.log("User not logged in");
        onLogout();
      }
    };
    initializeApp();
  }, [onLogout]);

  // Charger toutes les tâches depuis l'API
  const loadTodos = async (currentUserArg) => {
    const effectiveUser = currentUserArg || user;
    
    try {
      setLoading(true);
      setError(null);
      // Utilise l'ID Appwrite comme identifiant principal (pour la persistance même si email change)
      const responsable = effectiveUser?.$id || effectiveUser?.email || effectiveUser?.name;
      
      console.log('Frontend - Loading todos for:', {
        responsable: responsable,
        user: effectiveUser,
        userKeys: {
          $id: effectiveUser?.$id,
          email: effectiveUser?.email,
          name: effectiveUser?.name
        }
      });
      
      const items = await apiService.getUserItems(responsable);
      console.log('Frontend - API response:', items);
      
      // API retourne { message, data } sur les endpoints user
      const list = Array.isArray(items) ? items : (items?.data || []);
      console.log('Frontend - Processed list:', list);
      
      setTodos(list);
    } catch (error) {
      console.error("Frontend - Error loading todos:", error);
      console.error("Frontend - Error details:", {
        message: error.message,
        status: error.status,
        responsable: effectiveUser?.$id || effectiveUser?.email || effectiveUser?.name,
        user: effectiveUser
      });
      setError(`Erreur lors du chargement des tâches: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async () => {
    if (newTodo.Titre.trim()) {
      try {
        setLoading(true);
        setError(null);
        // Créer un objet avec tous les champs
        const todoData = {
          Titre: newTodo.Titre.trim(),
          Description: newTodo.Description.trim(),
          Statut: newTodo.Statut,
          DateLimite: newTodo.DateLimite || null,
          Priorite: newTodo.Priorite,
          // Utilise l'ID Appwrite comme identifiant principal (pour la persistance même si email change)
          Responsable: user?.$id || user?.email || user?.name || ""
        };
        const responsable = todoData.Responsable;
        
        console.log('Frontend - Adding todo with:', {
          responsable: responsable,
          user: user,
          todoData: todoData
        });
        
        await apiService.createUserItem(responsable, todoData);
        setNewTodo({
          Titre: "",
          Description: "",
          Statut: "pending",
          DateLimite: "",
          Priorite: "moyenne",
          Responsable: ""
        });
        await loadTodos(); // Recharger la liste
      } catch (error) {
        console.error("Error adding todo:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          responsable: user?.$id || user?.email || user?.name,
          user: user
        });
        setError(`Erreur lors de l'ajout de la tâche: ${error.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteTodo = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const responsable = user?.$id || user?.email || user?.name;
      await apiService.deleteUserItem(responsable, id);
      await loadTodos(); // Recharger la liste
    } catch (error) {
      console.error("Error deleting todo:", error);
      setError("Erreur lors de la suppression de la tâche");
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.ItemId === id);
    if (!todo) return;

    const newStatus = todo.Statut === 'completed' ? 'pending' : 'completed';
    try {
      setLoading(true);
      setError(null);
      const responsable = user?.$id || user?.email || user?.name;
      await apiService.updateUserItem(responsable, id, { ...todo, Statut: newStatus });
      await loadTodos(); // Recharger la liste
    } catch (error) {
      console.error("Error updating todo:", error);
      setError("Erreur lors de la mise à jour de la tâche");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (todo) => {
    setEditingId(todo.ItemId);
    setEditingData({ ...todo });
  };

  const saveEdit = async () => {
    if (editingData.Titre.trim()) {
      try {
        setLoading(true);
        setError(null);
        // Mettre à jour tous les champs
        const updatedData = {
          ...editingData,
          Titre: editingData.Titre.trim(),
          Description: editingData.Description.trim(),
          DateLimite: editingData.DateLimite || null,
          Priorite: editingData.Priorite,
          Statut: editingData.Statut
        };
        const responsable = user?.$id || user?.email || user?.name;
        await apiService.updateUserItem(responsable, editingId, updatedData);
        setEditingId(null);
        setEditingData({});
        await loadTodos(); // Recharger la liste
      } catch (error) {
        console.error("Error updating todo:", error);
        setError("Erreur lors de la mise à jour de la tâche");
      } finally {
        setLoading(false);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (editingId) {
        saveEdit();
      } else {
        addTodo();
      }
    }
  };

  const handleInputChange = (field, value) => {
    setNewTodo(prev => ({ ...prev, [field]: value }));
  };

  const handleEditInputChange = (field, value) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };


  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      onLogout();
    } catch (error) {
      console.log("Logout error:", error);
      onLogout();
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="todo-container">
      <div className="todo-header">
        <h1>Todo List</h1>
        <div className="user-info">
          <span>Welcome, {user.name || user.email} (ID: {user.$id})</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          margin: '10px 0', 
          borderRadius: '4px' 
        }}>
          {error}
        </div>
      )}

      {/* {loading && (
        <div className="loading-message" style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666' 
        }}>
          Chargement...
        </div> */}
   

      <div className="todo-form-section">
        <h3>Ajouter une nouvelle tâche</h3>
        <div className="todo-form">
          <div className="form-group">
            <label>Titre:</label>
            <input
              type="text"
              value={newTodo.Titre}
              onChange={(e) => handleInputChange('Titre', e.target.value)}
              placeholder="Titre de la tâche..."
              className="todo-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <input
              type="text"
              value={newTodo.Description}
              onChange={(e) => handleInputChange('Description', e.target.value)}
              placeholder="Description..."
              className="todo-input"
            />
          </div>
          
          <div className="form-group">
            <label>Date limite:</label>
            <input
              type="date"
              value={newTodo.DateLimite}
              onChange={(e) => handleInputChange('DateLimite', e.target.value)}
              className="todo-date"
            />
          </div>
          
          <div className="form-group">
            <label>Priorité:</label>
            <select
              value={newTodo.Priorite}
              onChange={(e) => handleInputChange('Priorite', e.target.value)}
              className="todo-select"
            >
              <option value="faible">Faible</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Statut:</label>
            <select
              value={newTodo.Statut}
              onChange={(e) => handleInputChange('Statut', e.target.value)}
              className="todo-select"
            >
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
          </div>
          
          <button onClick={addTodo} className="add-btn" disabled={loading || !newTodo.Titre.trim()}>
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>

        
      

      <div className="todo-stats">
        <span>Total: {todos.length}</span>
        <span>Completed: {todos.filter(todo => todo.Statut === 'completed').length}</span>
        <span>Remaining: {todos.filter(todo => todo.Statut !== 'completed').length}</span>
      </div>

      <div className="todo-list">
        {todos.length === 0 ? (
          <div className="empty-state">
           
          </div>
        ) : (
          todos.map(todo => (
            <div key={todo.ItemId} className={`todo-item ${todo.Statut === 'completed' ? 'completed' : ''}`}>
              <div className="todo-main">
                <input
                  type="checkbox"
                  checked={todo.Statut === 'completed'}
                  onChange={() => toggleTodo(todo.ItemId)}
                  className="todo-checkbox"
                />

                <div className="todo-content">
                  {editingId === todo.ItemId ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editingData.Titre}
                        onChange={(e) => handleEditInputChange('Titre', e.target.value)}
                        className="edit-input"
                        placeholder="Titre"
                        style={{minWidth: '120px'}}
                      />
                      <input
                        type="text"
                        value={editingData.Description}
                        onChange={(e) => handleEditInputChange('Description', e.target.value)}
                        className="edit-input"
                        placeholder="Description"
                        style={{minWidth: '100px'}}
                      />
                      <input
                        type="date"
                        value={editingData.DateLimite}
                        onChange={(e) => handleEditInputChange('DateLimite', e.target.value)}
                        className="edit-date"
                      />
                      <select
                        value={editingData.Priorite}
                        onChange={(e) => handleEditInputChange('Priorite', e.target.value)}
                        className="edit-select"
                      >
                        <option value="faible">Faible</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="haute">Haute</option>
                        <option value="urgente">Urgente</option>
                      </select>
                      <select
                        value={editingData.Statut}
                        onChange={(e) => handleEditInputChange('Statut', e.target.value)}
                        className="edit-select"
                      >
                        <option value="pending">En attente</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminé</option>
                      </select>
                    </div>
                  ) : (
                    <div className="todo-details">
                      <h4 className="todo-title" onDoubleClick={() => startEditing(todo)}>
                        {todo.Titre}
                      </h4>
                      {todo.Description && (
                        <p className="todo-description">{todo.Description}</p>
                      )}
                      <div className="todo-meta">
                        <span className={`priority-badge priority-${todo.Priorite}`}>
                          {todo.Priorite}
                        </span>
                        <span className={`status-badge status-${todo.Statut}`}>
                          {todo.Statut === 'pending' ? 'En attente' : 
                           todo.Statut === 'in_progress' ? 'En cours' : 'Terminé'}
                        </span>
                        {todo.DateLimite && (
                          <span className="date-badge">
                            {new Date(todo.DateLimite).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="todo-actions">
                {editingId === todo.ItemId ? (
                  <>
                    <button onClick={saveEdit} className="save-btn" disabled={loading}>
                      {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                    <button onClick={cancelEdit} className="cancel-btn">Annuler</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditing(todo)} className="edit-btn">
                      Modifier
                    </button>
                    <button onClick={() => deleteTodo(todo.ItemId)} className="delete-btn" disabled={loading}>
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoList;