"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { authService, User as AuthUser } from '../services/authService';

interface UserContextType {
  // Core user state
  user: SupabaseUser | null;
  internalUserId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Authentication actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  
  // User utilities
  getUserDisplayName: () => string;
  getUserEmail: () => string | null;
  getUserAvatar: () => string | null;
  isGuestUser: () => boolean;
  canCreateGroups: () => boolean;
  
  // State management
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  console.log('UserProvider: Initializing...');
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('UserContext: Initializing authentication...');
      
      // Initialize auth service
      const authData = await authService.initializeAuth();
      
      if (authData?.user) {
        setUser(authData.user as SupabaseUser);
        
        // Get internal user ID
        const internalId = authService.getCurrentInternalUserId();
        setInternalUserId(internalId);
        
        console.log('UserContext: Authentication initialized successfully', {
          user: authData.user.email,
          internalUserId: internalId
        });
      } else {
        setUser(null);
        setInternalUserId(null);
        console.log('UserContext: No authenticated user found');
      }
    } catch (err: any) {
      console.error('UserContext: Failed to initialize authentication:', err);
      setError(err?.message || 'Failed to initialize authentication');
      setUser(null);
      setInternalUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser as SupabaseUser);
        
        // Get or refresh internal user ID
        const internalId = await authService.getInternalUserId(currentUser as AuthUser);
        setInternalUserId(internalId);
        
        console.log('UserContext: User data refreshed', {
          user: currentUser.email,
          internalUserId: internalId
        });
      } else {
        setUser(null);
        setInternalUserId(null);
      }
    } catch (err: any) {
      console.error('UserContext: Failed to refresh user:', err);
      setError(err?.message || 'Failed to refresh user data');
    }
  }, []);

  // Initialize on mount and set up auth state listener
  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('UserContext: Auth state changed:', event, session?.user?.email);
        
        if (!session?.user) {
          // User logged out
          setUser(null);
          setInternalUserId(null);
          setError(null);
        } else {
          // User logged in or session renewed
          setUser(session.user);
          
          // Get internal user ID
          const internalId = authService.getCurrentInternalUserId();
          setInternalUserId(internalId);
          
          // If no internal ID, try to get it
          if (internalId === null || internalId === 0) {
            try {
              const newInternalId = await authService.getInternalUserId(session.user as AuthUser);
              setInternalUserId(newInternalId);
            } catch (err) {
              console.error('UserContext: Failed to get internal user ID:', err);
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initializeAuth]);

  // Authentication functions
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const result = await authService.signIn(email, password);
      
      if (result.user) {
        setUser(result.user as SupabaseUser);
        
        // Get internal user ID
        const internalId = await authService.getInternalUserId(result.user as AuthUser);
        setInternalUserId(internalId);
        
        return { success: true };
      } else {
        throw new Error('Sign in failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sign in';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const result = await authService.signUp(email, password, metadata);
      
      if (result.user) {
        setUser(result.user as SupabaseUser);
        
        // Get internal user ID
        const internalId = await authService.getInternalUserId(result.user as AuthUser);
        setInternalUserId(internalId);
        
        return { success: true };
      } else {
        throw new Error('Sign up failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sign up';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await authService.signOut();
      setUser(null);
      setInternalUserId(null);
    } catch (err: any) {
      console.error('UserContext: Failed to sign out:', err);
      setError(err?.message || 'Failed to sign out');
    }
  }, []);

  // Utility functions
  const getUserDisplayName = useCallback(() => {
    if (!user) return '';
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'User';
  }, [user]);

  const getUserEmail = useCallback(() => {
    return user?.email || null;
  }, [user]);

  const getUserAvatar = useCallback(() => {
    return user?.user_metadata?.avatar_url || null;
  }, [user]);

  const isGuestUser = useCallback(() => {
    return internalUserId === null || internalUserId === 0;
  }, [internalUserId]);

  const canCreateGroups = useCallback(() => {
    return internalUserId !== null && internalUserId >= 2;
  }, [internalUserId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue: UserContextType = {
    // Core state
    user,
    internalUserId,
    isAuthenticated: !!user,
    isLoading,
    error,
    
    // Authentication actions
    signIn,
    signUp,
    signOut,
    
    // Utilities
    getUserDisplayName,
    getUserEmail,
    getUserAvatar,
    isGuestUser,
    canCreateGroups,
    
    // State management
    refreshUser,
    clearError,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the user context
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    console.error('useUser called outside of UserProvider. Make sure components using useUser are wrapped in UserProvider.');
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Export types for external use
export type { UserContextType };