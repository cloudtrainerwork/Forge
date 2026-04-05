'use client';

/**
 * AuthContext — global auth state for FORGE.
 *
 * Stores the FORGE JWT (issued by backend after OAuth), user info, and tenant context.
 * Provides sign-in, sign-out, tenant switching, and token refresh.
 *
 * The JWT is stored in localStorage and automatically attached to API requests
 * via the ApiClient.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  activeTenant: TenantInfo | null;
  tenants: TenantInfo[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (provider: string, providerToken: string, providerAccountId: string, email: string, name?: string, image?: string) => Promise<void>;
  devSignIn: () => Promise<void>;
  signOut: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (name: string, slug: string) => Promise<TenantInfo>;
  getToken: () => string | null;
}

// ── Storage keys ────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  TOKEN: 'forge_jwt',
  USER: 'forge_user',
  TENANT: 'forge_active_tenant',
  TENANTS: 'forge_tenants',
} as const;

// ── API helpers ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message || `Auth request failed: ${res.status}`);
  }

  return res.json();
}

async function authFetchWithToken<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  return authFetch<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

// ── Context ─────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTenant, setActiveTenant] = useState<TenantInfo | null>(null);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedTenant = localStorage.getItem(STORAGE_KEYS.TENANT);
      const savedTenants = localStorage.getItem(STORAGE_KEYS.TENANTS);

      if (savedToken && savedUser) {
        // Verify token isn't expired
        const payload = parseJwt(savedToken);
        if (payload && payload.exp * 1000 > Date.now()) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          if (savedTenant) setActiveTenant(JSON.parse(savedTenant));
          if (savedTenants) setTenants(JSON.parse(savedTenants));
        } else {
          // Token expired — clear storage
          clearStorage();
        }
      }
    } catch {
      clearStorage();
    }
    setIsLoading(false);
  }, []);

  const clearStorage = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  const persistSession = useCallback((t: string, u: AuthUser, at: TenantInfo | null, ts: TenantInfo[]) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, t);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    if (at) localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(at));
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(ts));
  }, []);

  // ── Sign in with OAuth provider ─────────────────────────────────────────────

  const signIn = useCallback(async (
    provider: string,
    providerToken: string,
    providerAccountId: string,
    email: string,
    name?: string,
    image?: string,
  ) => {
    setIsLoading(true);
    try {
      const result = await authFetch<{
        data: {
          user: AuthUser;
          tenants: TenantInfo[];
          token: string | null;
          activeTenant: TenantInfo | null;
        };
      }>('/auth/callback', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          providerAccountId,
          email,
          name,
          image,
          tokens: { access_token: providerToken },
        }),
      });

      const { user: authUser, tenants: userTenants, token: jwt, activeTenant: active } = result.data;

      setUser(authUser);
      setTenants(userTenants);

      if (jwt) {
        setToken(jwt);
        setActiveTenant(active);
        persistSession(jwt, authUser, active, userTenants);
      } else {
        // No tenants yet — user needs to create one
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
        localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(userTenants));
      }
    } finally {
      setIsLoading(false);
    }
  }, [persistSession]);

  // ── Dev sign-in — calls backend to seed DB and get a real JWT ───────────────

  const devSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call the backend auth callback with provider='dev'
      // This seeds the dev tenant/user/membership in the database and returns a real JWT
      const result = await authFetch<{
        data: {
          user: AuthUser;
          tenants: TenantInfo[];
          token: string;
          activeTenant: TenantInfo;
        };
      }>('/auth/callback', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'dev',
          providerAccountId: 'dev-local',
          email: 'dev@forge.local',
          name: 'Dev User',
          tokens: { access_token: 'dev' },
        }),
      });

      const { user: authUser, tenants: userTenants, token: jwt, activeTenant: active } = result.data;

      setUser(authUser);
      setToken(jwt);
      setActiveTenant(active);
      setTenants(userTenants);
      persistSession(jwt, authUser, active, userTenants);
    } catch (err) {
      // Backend not reachable — fall back to local-only dev token
      console.warn('[Auth] Backend unreachable for dev sign-in, using local fallback:', err);
      const devUserId = 'dev-user-001';
      const devTenantId = 'dev-tenant-001';
      const now = Math.floor(Date.now() / 1000);

      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: devUserId, tid: devTenantId, role: 'OWNER', iat: now, exp: now + 86400,
      }));
      const fakeToken = `${header}.${payload}.dev-signature`;
      const devUser: AuthUser = { id: devUserId, email: 'dev@forge.local', name: 'Dev User' };
      const devTenant: TenantInfo = { id: devTenantId, slug: 'dev', name: 'Development', role: 'OWNER' };

      setUser(devUser);
      setToken(fakeToken);
      setActiveTenant(devTenant);
      setTenants([devTenant]);
      persistSession(fakeToken, devUser, devTenant, [devTenant]);
    } finally {
      setIsLoading(false);
    }
  }, [persistSession]);

  // ── Sign out ────────────────────────────────────────────────────────────────

  const signOut = useCallback(() => {
    setUser(null);
    setToken(null);
    setActiveTenant(null);
    setTenants([]);
    clearStorage();
  }, [clearStorage]);

  // ── Switch tenant ───────────────────────────────────────────────────────────

  const switchTenant = useCallback(async (tenantId: string) => {
    if (!token) throw new Error('Not authenticated');

    const result = await authFetchWithToken<{
      data: { token: string; tenant: TenantInfo };
    }>('/auth/switch', token, {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    });

    const newToken = result.data.token;
    const newTenant = result.data.tenant;

    setToken(newToken);
    setActiveTenant(newTenant);
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(newTenant));
  }, [token]);

  // ── Create tenant ───────────────────────────────────────────────────────────

  const createTenant = useCallback(async (name: string, slug: string): Promise<TenantInfo> => {
    if (!token) throw new Error('Not authenticated');

    const result = await authFetchWithToken<{
      data: { tenant: TenantInfo; token: string };
    }>('/auth/tenant', token, {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });

    const newTenant = result.data.tenant;
    const newToken = result.data.token;

    // Update state
    const updatedTenants = [...tenants, newTenant];
    setTenants(updatedTenants);
    setToken(newToken);
    setActiveTenant(newTenant);

    persistSession(newToken, user!, newTenant, updatedTenants);

    return newTenant;
  }, [token, tenants, user, persistSession]);

  // ── Get token (for ApiClient) ───────────────────────────────────────────────

  const getToken = useCallback(() => token, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    activeTenant,
    tenants,
    isAuthenticated: !!token && !!user,
    isLoading,
    signIn,
    devSignIn,
    signOut,
    switchTenant,
    createTenant,
    getToken,
  }), [user, token, activeTenant, tenants, isLoading, signIn, devSignIn, signOut, switchTenant, createTenant, getToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ── JWT parsing helper ──────────────────────────────────────────────────────────

function parseJwt(token: string): { sub: string; tid: string; role: string; exp: number; iat: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}
