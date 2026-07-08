// Authentication service
//
// The default local mock keeps this demo app runnable without external
// services. Set VITE_AUTH_PROVIDER=nocodebackend to send auth requests to the
// same-origin /api/auth proxy. Keep NCB_SECRET_KEY in the server/runtime env
// used by the proxy; never expose it as a VITE_* variable.

// Mock user data
const MOCK_USERS = {
  'adult@example.com': {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'adult@example.com',
    name: 'Adult User',
    role: 'adult'
  },
  'work@example.com': {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'work@example.com',
    name: 'Workplace User',
    role: 'workplace'
  },
  'parent@example.com': {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'parent@example.com',
    name: 'Parent User',
    role: 'parent'
  },
  'teen@example.com': {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'teen@example.com',
    name: 'Teen User',
    role: 'teen'
  }
};

// Storage keys
const STORAGE_KEY_USER = 'adhd_lifeos_current_user';
const STORAGE_KEY_SESSION = 'adhd_lifeos_session';
const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER ?? 'mock';
const AUTH_PROXY_URL = import.meta.env.VITE_AUTH_PROXY_URL ?? '/api/auth';

// Helper to get stored user
const getStoredUser = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to set stored user
const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_SESSION, Date.now().toString());
  } else {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
};

// Auth state change listeners
let authListeners = [];

const notifyAuthChange = (event, user) => {
  authListeners.forEach(callback => {
    callback(event, { user });
  });
};

const normalizeUser = (payload) => payload?.user ?? payload?.data?.user ?? payload?.data ?? payload;

const requestAuthProxy = async (path, options = {}) => {
  const response = await fetch(`${AUTH_PROXY_URL}${path}`, {
    ...options,
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
    throw new Error(message);
  }

  return payload;
};

const ncbAuthService = {
  async signUp(email, password) {
    const payload = await requestAuthProxy('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const user = normalizeUser(payload);
    setStoredUser(user);
    notifyAuthChange('SIGNED_IN', user);
    return { user, session: payload?.session ?? { user } };
  },

  async signIn(email, password) {
    const payload = await requestAuthProxy('/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const user = normalizeUser(payload);
    setStoredUser(user);
    notifyAuthChange('SIGNED_IN', user);
    return { user, session: payload?.session ?? { user } };
  },

  async signOut() {
    try {
      await requestAuthProxy('/signout', { method: 'POST' });
    } finally {
      setStoredUser(null);
      notifyAuthChange('SIGNED_OUT', null);
    }

    return { error: null };
  },

  async getCurrentUser() {
    const storedUser = getStoredUser();

    if (!storedUser) {
      return null;
    }

    try {
      const payload = await requestAuthProxy('/me');
      const user = normalizeUser(payload);
      setStoredUser(user);
      return user;
    } catch {
      return storedUser;
    }
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

// Mock auth service
const mockAuthService = {
  async signUp(email, password) {
    // For testing, treat signup as signin
    return this.signIn(email, password);
  },

  async signIn(email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const user = MOCK_USERS[email];
    
    if (!user) {
      throw new Error('User not found. Please use one of the test accounts.');
    }

    // Store user in localStorage
    setStoredUser(user);

    // Notify listeners
    notifyAuthChange('SIGNED_IN', user);

    return { user, session: { user } };
  },

  async signOut() {
    setStoredUser(null);
    
    // Notify listeners
    notifyAuthChange('SIGNED_OUT', null);

    return { error: null };
  },

  async getCurrentUser() {
    return getStoredUser();
  },

  onAuthStateChange(callback) {
    authListeners.push(callback);

    // Return unsubscribe function
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

export const authService = AUTH_PROVIDER === 'nocodebackend' ? ncbAuthService : mockAuthService;
