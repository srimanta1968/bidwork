/**
 * Auth API Service - Client-side API calls for authentication
 * Uses existing backend endpoints:
 *   - POST /api/auth/register
 *   - POST /api/auth/login
 */

interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      role: string;
    };
    token: string;
  };
  error?: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  role: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

const API_BASE = '/api/auth';

/**
 * Register a new user
 */
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: AuthResponse = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Login an existing user
 */
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: AuthResponse = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Store auth token in localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem('bidwork_token', token);
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('bidwork_token');
}

/**
 * Remove auth token from localStorage
 */
export function removeToken(): void {
  localStorage.removeItem('bidwork_token');
}

/**
 * Store user data in localStorage
 */
export function setUser(user: { id: string; email: string; role: string }): void {
  localStorage.setItem('bidwork_user', JSON.stringify(user));
}

/**
 * Get user data from localStorage
 */
export function getUser(): { id: string; email: string; role: string } | null {
  const data = localStorage.getItem('bidwork_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  removeToken();
  localStorage.removeItem('bidwork_user');
}
