import { API_BASE_URL } from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log(`Making API request to: ${url}`, config);

    try {
      const response = await fetch(url, config);
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        } catch (e) {
          console.log('Could not parse error response as JSON');
          // Si on ne peut pas parser le JSON, on garde le message HTTP
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      
      // Gestion spécifique des erreurs de réseau
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error(`Erreur de connexion réseau. Vérifiez que le backend est accessible à ${this.baseURL}`);
        networkError.originalError = error;
        throw networkError;
      }
      
      throw error;
    }
  }

  // Méthodes pour les tâches d'un utilisateur spécifique
  async getUserItems(responsable) {
    return this.request(`/api/items/user/${encodeURIComponent(responsable)}`);
  }

  async getUserItem(responsable, id) {
    return this.request(`/api/items/user/${encodeURIComponent(responsable)}/${id}`);
  }

  async createUserItem(responsable, itemData) {
    return this.request(`/api/items/user/${encodeURIComponent(responsable)}`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateUserItem(responsable, id, itemData) {
    return this.request(`/api/items/user/${encodeURIComponent(responsable)}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deleteUserItem(responsable, id) {
    return this.request(`/api/items/user/${encodeURIComponent(responsable)}/${id}`, {
      method: 'DELETE',
    });
  }

  // Méthodes génériques pour les tâches (ancien système)
  async getAllItems() {
    return this.request('/api/items');
  }

  async getItem(id) {
    return this.request(`/api/items/${id}`);
  }

  async createItem(itemData) {
    return this.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateItem(id, itemData) {
    return this.request(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deleteItem(id) {
    return this.request(`/api/items/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();