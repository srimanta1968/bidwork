/**
 * Auth & Profile API Service
 */

export interface UserData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_onboarded: boolean;
  is_email_verified?: boolean;
}

interface AuthResponse {
  success: boolean;
  data?: { user: UserData; token: string };
  error?: string;
}

interface ProfileResponse {
  success: boolean;
  data?: { profile: any };
  error?: string;
}

const API_BASE = '/api';

export async function registerUser(payload: { first_name: string; last_name: string; email: string; password: string; role: string }): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch { return { success: false, error: 'Network error. Please try again.' }; }
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch { return { success: false, error: 'Network error. Please try again.' }; }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch { return { success: false, error: 'Network error. Please try again.' }; }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return await response.json();
  } catch { return { success: false, error: 'Network error. Please try again.' }; }
}

export async function onboardProfile(token: string, payload: any): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE}/profile/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch { return { success: false, error: 'Network error. Please try again.' }; }
}

export async function getMyProfile(token: string): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE}/profile/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return await response.json();
  } catch { return { success: false, error: 'Network error.' }; }
}

export function setToken(token: string): void { localStorage.setItem('bidwork_token', token); }
export function getToken(): string | null { return localStorage.getItem('bidwork_token'); }
export function removeToken(): void { localStorage.removeItem('bidwork_token'); }

export function setUser(user: UserData): void { localStorage.setItem('bidwork_user', JSON.stringify(user)); }
export function getUser(): UserData | null {
  const data = localStorage.getItem('bidwork_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function clearAuth(): void { removeToken(); localStorage.removeItem('bidwork_user'); }
