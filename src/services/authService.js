import { clearAuthenticatedUserCache, setCurrentUser } from './authStorage';

class AuthProxyError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AuthProxyError';
    this.status = status;
  }
}

// Authentication service
//
// Browser auth requests go through the same-origin /api/auth proxy so the
// server/runtime can attach the NoCodeBackend secret key without exposing it to
// client code. NoCodeBackend session cookies are included on every request.

const AUTH_PROXY_URL = import.meta.env.VITE_AUTH_PROXY_URL ?? '/api/ncb/auth';

// Auth state change listeners
let authListeners = [];

const notifyAuthChange = (event, user) => {
  authListeners.forEach(callback => {
    callback(event, { user });
  });
};

const normalizeSession = (payload) => payload?.session ?? payload?.data?.session ?? payload?.data ?? payload;
const normalizeUser = (payload) => payload?.user ?? payload?.data?.user ?? payload?.data?.session?.user ?? payload?.session?.user ?? null;

const requestAuthProxy = async (path, options = {}) => {
  const response = await fetch(`${AUTH_PROXY_URL}/${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.message ?? payload?.error ?? 'Authentication request failed';
    throw new AuthProxyError(message, response.status);
  }

  return payload;
};

const buildAuthResult = (payload) => {
  const user = normalizeUser(payload);
  const session = normalizeSession(payload) ?? (user ? { user } : null);

  // Keep the existing current-user cache in sync for app services that still
  // read a user id from authStorage; NoCodeBackend remains the source of truth.
  setCurrentUser(user);

  return { user, session };
};

export const authService = {
  async signUp(email, password) {
    const payload = await requestAuthProxy('sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const result = buildAuthResult(payload);
    notifyAuthChange('SIGNED_IN', result.user);
    return result;
  },

  async signIn(email, password) {
    const payload = await requestAuthProxy('sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const result = buildAuthResult(payload);
    notifyAuthChange('SIGNED_IN', result.user);
    return result;
  },

  async signOut() {
    try {
      await requestAuthProxy('sign-out', { method: 'POST' });
    } finally {
      clearAuthenticatedUserCache();
      notifyAuthChange('SIGNED_OUT', null);
    }

    return { error: null };
  },

  async getCurrentUser() {
    const payload = await requestAuthProxy('get-session');
    const user = normalizeUser(payload);
    setCurrentUser(user);
    return user;
  },

  clearCurrentUser() {
    clearAuthenticatedUserCache();
  },

  isUnauthorizedError(error) {
    return error?.status === 401 || error?.status === 403;
  },

  onAuthStateChange(callback) {
    authListeners.push(callback);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners = authListeners.filter(cb => cb !== callback);
          }
        }
      }
    };
  }
};
