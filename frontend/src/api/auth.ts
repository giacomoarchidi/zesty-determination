import apiClient from './client';
import type { User, AuthResponse } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'student' | 'tutor' | 'parent';
  first_name: string;
  last_name: string;
  school_level?: string;
  bio?: string;
  subjects?: string;
  hourly_rate?: number;
  phone?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export const authApi = {
  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const shouldPrehash = (() => {
      if (typeof window === 'undefined') return false;
      const host = window.location.hostname;
      // Pre-hash su ambienti hostati (vercel) quando backend è Railway (limite bcrypt 72B)
      return host.endsWith('.vercel.app');
    })();

    let payload: LoginRequest = credentials;
    if (shouldPrehash) {
      try {
        const enc = new TextEncoder();
        const data = enc.encode(credentials.password);
        const digest = await crypto.subtle.digest('SHA-256', data);
        // Usa base64url (43-44 caratteri) per restare ben sotto 72 byte
        const b64full = btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const b64 = b64full.slice(0, 32);
        payload = { ...credentials, password: b64 };
      } catch {
        // Fallback: tronca in modo sicuro a 72 byte
        const enc = new TextEncoder();
        const bytes = enc.encode(credentials.password);
        if (bytes.length > 72) {
          const truncated = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 72));
          payload = { ...credentials, password: truncated };
        }
      }
    }

    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  // Register user
  register: async (userData: RegisterRequest): Promise<User> => {
    const shouldPrehash = (() => {
      if (typeof window === 'undefined') return false;
      const host = window.location.hostname;
      return host.endsWith('.vercel.app');
    })();

    let payload: RegisterRequest = userData;
    if (shouldPrehash) {
      try {
        const enc = new TextEncoder();
        const data = enc.encode(userData.password);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const b64full = btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const b64 = b64full.slice(0, 32);
        payload = { ...userData, password: b64 };
      } catch {
        // Fallback: tronca a 72 byte in UTF-8
        const enc = new TextEncoder();
        const bytes = enc.encode(userData.password);
        if (bytes.length > 72) {
          const truncated = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 72));
          payload = { ...userData, password: truncated };
        }
      }
    }

    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: PasswordChangeRequest): Promise<{ message: string }> => {
    const response = await apiClient.put('/auth/password', passwordData);
    return response.data;
  },

  // Deactivate account
  deactivateAccount: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete('/auth/deactivate');
    return response.data;
  },
};
