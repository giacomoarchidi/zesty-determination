import axios from 'axios';

// Se presente, usa SEMPRE la variabile d'ambiente (anche in locale) per assicurare stesso backend fra client diversi
const isLocalDev = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).trim() !== '')
  ? String(import.meta.env.VITE_API_BASE_URL)
  : (isLocalDev ? 'http://localhost:8000' : 'http://localhost:8000');

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,  // Disabilitato per compatibilità con CORS wildcard
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    console.log('🔑 [API Client] Token trovato:', token ? `${token.substring(0, 20)}...` : 'NESSUN TOKEN');
    console.log('🌐 [API Client] Request URL:', config.baseURL + config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('🔍 API Error:', error);
    
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      console.log('🔑 Token scaduto o non valido, pulizia e redirect al login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('current_user_role');
      // Usa window.location per forzare il redirect
      window.location.href = '/';
    }
    
    // Don't reject on network errors to prevent white page
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.warn('Backend not available, continuing in demo mode');
      return Promise.resolve({ data: null, status: 503 });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
