import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AUTH_STATUS = {
  INITIALIZING: 'initializing',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  ERROR: 'error'
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(AUTH_STATUS.INITIALIZING);
  const [error, setError] = useState(null);
  const verificationStarted = useRef(false);
  const mounted = useRef(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    authService.clearCurrentUser();
  }, []);

  const verifySession = useCallback(async () => {
    setStatus(AUTH_STATUS.INITIALIZING);
    setError(null);

    try {
      const currentUser = await authService.getCurrentUser();
      if (!mounted.current) return null;

      setUser(currentUser);
      setStatus(currentUser ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
      return currentUser;
    } catch (verificationError) {
      if (!mounted.current) return null;

      clearAuthState();
      if (authService.isUnauthorizedError(verificationError)) {
        setStatus(AUTH_STATUS.ANONYMOUS);
        return null;
      }

      console.error('Error checking auth state:', verificationError);
      setError(verificationError);
      setStatus(AUTH_STATUS.ERROR);
      return null;
    }
  }, [clearAuthState]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (verificationStarted.current) return;

    // This guard also prevents React Strict Mode's development effect replay
    // from sending a second get-session request.
    verificationStarted.current = true;
    verifySession();
  }, [verifySession]);

  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setError(null);
      setStatus(nextUser ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    status,
    error,
    loading: status === AUTH_STATUS.INITIALIZING,
    clearAuthState,
    retrySessionVerification: verifySession,
    signIn: async (email, password) => {
      try {
        const result = await authService.signIn(email, password);
        setUser(result.user);
        setError(null);
        setStatus(result.user ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
        return result;
      } catch (signInError) {
        console.error('Sign in error:', signInError);
        throw signInError;
      }
    },
    signUp: async (email, password) => {
      try {
        const result = await authService.signUp(email, password);
        setUser(result.user);
        setError(null);
        setStatus(result.user ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);
        return result;
      } catch (signUpError) {
        console.error('Sign up error:', signUpError);
        throw signUpError;
      }
    },
    signOut: async () => {
      try {
        await authService.signOut();
        clearAuthState();
        setError(null);
        setStatus(AUTH_STATUS.ANONYMOUS);
      } catch (signOutError) {
        console.error('Sign out error:', signOutError);
        throw signOutError;
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
