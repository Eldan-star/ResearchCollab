import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Session, User as SupabaseAuthUser } from '@supabase/gotrue-js';
import { supabase } from '../lib/supabaseClient';
import { UserProfile, UserRole } from '../types';
import { UNIVERSITY_EMAIL_DOMAINS } from '../constants';

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  isResearchLead: boolean;
  isContributor: boolean;
  isAdmin: boolean;
  signUp: (params: { email: string; password_hash: string; name: string; institution: string; role: UserRole; is_anonymous?: boolean; }) => Promise<{ error: any; message?: string }>;
  signInWithPassword: (params: { email: string; password_hash: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ data: UserProfile | null; error: any }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserProfile = useCallback(async (authUser: SupabaseAuthUser | null): Promise<UserProfile | null> => {
    if (!authUser) return null;
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      if (error) throw error;
      return data as UserProfile;
    } catch (e) {
      console.error('AuthContext:fetchUserProfile - Error:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    // onAuthStateChange is the single source of truth for the user's session.
    const { data: authListenerData } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log(`AuthContext:onAuthStateChange - Event: ${_event}`, newSession);
      setSession(newSession);
      if (newSession?.user) {
        const profile = await fetchUserProfile(newSession.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false); // This is reliably called after every auth state change.
    });

    return () => {
      authListenerData?.subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const validateUniversityEmail = (email: string): boolean => {
    if (UNIVERSITY_EMAIL_DOMAINS.length === 0 || UNIVERSITY_EMAIL_DOMAINS[0] === '') return true;
    const domain = email.substring(email.lastIndexOf('@') + 1);
    return UNIVERSITY_EMAIL_DOMAINS.includes(domain);
  };

  const signUp = async (params: { email: string; password_hash: string; name: string; institution: string; role: UserRole; is_anonymous?: boolean; }) => {
    if (!validateUniversityEmail(params.email)) {
      return { error: { message: `Email must be from an approved university domain (${UNIVERSITY_EMAIL_DOMAINS.join(', ')}).` } };
    }
    // This function now correctly passes the profile data to the options,
    // which your database trigger will use. It does not manually insert a profile.
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password_hash,
      options: {
        data: {
          name: params.name,
          institution: params.institution,
          role: params.role,
          is_anonymous: params.role === UserRole.RESEARCH_LEAD ? (params.is_anonymous || false) : false,
        }
      }
    });

    if (error) return { error };
    // If email confirmation is ON, there will be no session yet.
    if (!data.session) {
      return { error: null, message: "Signup successful! Please check your email to confirm your account." };
    }
    // If email confirmation is OFF, onAuthStateChange will handle the new session.
    return { error: null };
  };

  const signInWithPassword = async (params: { email: string; password_hash: string }) => {
    // This function is now very simple. It just makes the call and lets
    // onAuthStateChange handle the result.
    const { error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password_hash,
    });
    return { error };
  };

  const signOut = async () => {
    // Simple and reliable. onAuthStateChange will catch the SIGNED_OUT event.
    await supabase.auth.signOut();
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { data: null, error: { message: 'User not logged in' } };
    const { data, error } = await supabase.from('users').update(updates).eq('id', user.id).select().single();
    if (!error && data) {
      // After updating, we can manually update the local state for immediate feedback
      // or just rely on a refetch, but this is faster.
      setUser(data as UserProfile);
    }
    return { data: data as UserProfile | null, error };
  };

  const value = { session, user, loading, isResearchLead: user?.role === UserRole.RESEARCH_LEAD, isContributor: user?.role === UserRole.CONTRIBUTOR, isAdmin: user?.role === UserRole.ADMIN, signUp, signInWithPassword, signOut, updateUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};