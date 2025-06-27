// contexts/AuthContext.tsx

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'; // Added useRef
import type { Session, User as SupabaseAuthUser } from '@supabase/gotrue-js';
import { supabase } from '../lib/supabaseClient.ts';
import { UserProfile, UserRole } from '../types.ts';
import { UNIVERSITY_EMAIL_DOMAINS } from '../constants.ts';

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  isResearchLead: boolean;
  isContributor: boolean;
  isAdmin: boolean;
  signUp: (params: { email: string; password_hash: string; name: string; institution: string; role: UserRole; is_anonymous?: boolean; profile_photo_url?: string }) => Promise<{ error: any }>;
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
  const [loading, setLoading] = useState<boolean>(true); // Initial state is true
  const isSigningOutRef = useRef(false); // Ref to track sign-out process

  const fetchUserProfile = useCallback(async (authUser: SupabaseAuthUser | null): Promise<UserProfile | null> => {
    if (!authUser) {
      // console.log("AuthContext:fetchUserProfile - No authUser provided, returning null."); // Keep logs minimal if working
      return null;
    }
    // console.log("AuthContext:fetchUserProfile - Attempting to fetch profile for user:", authUser.id);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (error) {
        console.error('AuthContext:fetchUserProfile - Error fetching profile from DB:', error.message);
        return null;
      }
      // console.log("AuthContext:fetchUserProfile - Profile fetched successfully for user:", authUser.id, data);
      return data as UserProfile;
    } catch (e: any) {
      console.error('AuthContext:fetchUserProfile - CATCH BLOCK EXCEPTION for user:', authUser.id, e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log("AuthContext:useEffect - Mounting and setting up initial data and listener.");
    let isMounted = true;

    const setData = async () => {
      if (!isMounted) return;
      console.log("AuthContext:useEffect:setData - Starting initial session and profile fetch.");
      let currentSession: Session | null = null;
      let sessionError: any | null = null;

      try {
        console.log("AuthContext:useEffect:setData - Attempting supabase.auth.getSession()");
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AuthContext: supabase.auth.getSession() timed out after 10 seconds")), 10000)
        );

        const raceResult = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null }, error: any | null };
        
        currentSession = raceResult.data.session;
        sessionError = raceResult.error;

        console.log("AuthContext:useEffect:setData - getSession attempt completed.", { currentSessionUserId: currentSession?.user?.id, sessionError: sessionError?.message });

        if (sessionError) {
          console.error("AuthContext:useEffect:setData - Error from getSession (or timeout):", sessionError.message);
        }
        
        if (isMounted) setSession(currentSession);

        if (currentSession?.user) {
          console.log("AuthContext:useEffect:setData - Session exists. Fetching profile for user:", currentSession.user.id);
          const profile = await fetchUserProfile(currentSession.user);
          if (isMounted) setUser(profile);
          console.log("AuthContext:useEffect:setData - Profile fetch attempt complete. Profile User ID:", profile?.id);
        } else {
          console.log("AuthContext:useEffect:setData - No current session or user. Setting user to null.");
          if (isMounted) setUser(null);
        }
      } catch (e: any) {
          console.error("AuthContext:useEffect:setData - CATCH BLOCK EXCEPTION:", e.message);
          if (isMounted) {
            setUser(null); 
            setSession(null);
          }
      } finally {
          if (isMounted) {
            console.log("AuthContext:useEffect:setData - FINALLY: Setting loading to false.");
            setLoading(false); 
          }
      }
    };

    setData();

    console.log("AuthContext:useEffect - Setting up onAuthStateChange listener.");
    const { data: authListenerData } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      console.log(`AuthContext:onAuthStateChange - Event: ${_event}. isSigningOutRef: ${isSigningOutRef.current}. New session user: ${newSession?.user?.id}`);
      
      // --- Start: isSigningOutRef check ---
      if (isSigningOutRef.current && _event === 'SIGNED_IN') {
          console.warn("AuthContext:onAuthStateChange - IGNORED 'SIGNED_IN' event because sign-out is in progress.");
          if (newSession?.user) { // Only ignore if it's a SIGNED_IN event with an actual session
              return;
          }
      }
      if (isSigningOutRef.current && _event === 'SIGNED_OUT') {
          console.log("AuthContext:onAuthStateChange - 'SIGNED_OUT' event received during sign-out process. Resetting flag.");
          isSigningOutRef.current = false; 
      }
      // --- End: isSigningOutRef check ---

      console.log(`AuthContext:onAuthStateChange - BEFORE state update. Event: ${_event}. Current context session ID: ${session?.user?.id}, Current context user ID: ${user?.id}. New session user ID: ${newSession?.user?.id}`);
      
      if (isMounted) setSession(newSession); 

      if (newSession?.user) {
        console.log("AuthContext:onAuthStateChange - New session has user. Fetching profile for:", newSession.user.id);
        try {
            const profile = await fetchUserProfile(newSession.user);
            if (isMounted) setUser(profile);
            console.log("AuthContext:onAuthStateChange - Profile fetch attempt complete. Profile User ID:", profile?.id);
        } catch (e: any) { // Type 'any' for simplicity as it's a generic catch
            console.error("AuthContext:onAuthStateChange - CATCH BLOCK EXCEPTION while fetching profile:", e.message);
            if (isMounted) setUser(null); 
        }
      } else {
        console.log("AuthContext:onAuthStateChange - No user in new session. Setting user to null.");
        if (isMounted) setUser(null); 
      }
      console.log(`AuthContext:onAuthStateChange - AFTER state update. Event: ${_event}. New context session ID: ${session?.user?.id}, New context user ID: ${user?.id}.`);
      if (isMounted && loading && (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT')) {
        console.log(`AuthContext:onAuthStateChange - Setting loading to false due to event: ${_event}`);
        setLoading(false);
      }

    });

    return () => {
      console.log("AuthContext:useEffect - Unsubscribing from onAuthStateChange.");
      isMounted = false;
      authListenerData?.subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserProfile]); // session and user are intentionally omitted from deps to avoid re-running on their change from within


  const validateUniversityEmail = (email: string): boolean => {
    if (UNIVERSITY_EMAIL_DOMAINS.length === 0 || (UNIVERSITY_EMAIL_DOMAINS.length === 1 && UNIVERSITY_EMAIL_DOMAINS[0] === '')) return true;
    const domain = email.substring(email.lastIndexOf('@') + 1);
    return UNIVERSITY_EMAIL_DOMAINS.includes(domain);
  };

  const signUp = async (params: { email: string; password_hash: string; name: string; institution: string; role: UserRole; is_anonymous?: boolean; profile_photo_url?: string }) => {
    if (!validateUniversityEmail(params.email)) {
       return { error: { message: `Email must be from an approved university domain (${UNIVERSITY_EMAIL_DOMAINS.join(', ')}).` } };
    }
    console.log("AuthContext:signUp - Starting sign up process for:", params.email);
    setLoading(true);

    try {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: params.email,
            password: params.password_hash,
            options: { 
              data: { 
                name: params.name, 
                institution: params.institution,
                role: params.role, 
                is_anonymous: params.role === UserRole.RESEARCH_LEAD ? (params.is_anonymous || false) : false,
                // profile_photo_url: params.profile_photo_url, // If you want to pass this to the trigger
              }
            }
        });

        if (signUpError) {
            console.error('AuthContext:signUp - Supabase auth.signUp error:', signUpError);
            return { error: signUpError };
        }

        const authUser = authData.user;
        const newSession = authData.session;

        if (!authUser) {
            console.error('AuthContext:signUp - Auth user is null after signUp call completed, even if no direct error.');
            // This might happen if user creation fails silently for some reason or if the response structure changes.
            return { error: { message: 'Sign up process did not return a user. Please try again or contact support.'}};
        }
        
        console.log('AuthContext:signUp - User authenticated by Supabase Auth, preparing profile data. User ID:', authUser.id);
        // Profile creation is now handled by a DB trigger function `create_public_user_on_auth_user_creation`
        // which copies data from auth.users.raw_user_meta_data or options.data into public.users.
        // No explicit supabase.from('users').insert(...) here.

        console.log('AuthContext:signUp - Auth user created. Profile creation assumed handled by DB trigger. Session:', newSession ? `Exists (User: ${newSession.user.id})` : "Null (Email confirmation may be pending)");

        if (!newSession) {
            console.warn('AuthContext:signUp - User created in auth, but no active session. Email confirmation likely pending.');
             return { 
                error: null, // Not an error per se, but an info message for the UI
                message: 'Signup successful! Please check your email to confirm your account.' 
            };
        }
        
        // If an immediate session is available (e.g., email confirmation is off or auto-confirmed):
        // onAuthStateChange will pick up this new active session and fetch the (trigger-created) profile.
        console.log('AuthContext:signUp - Signup successful with an immediate active session. onAuthStateChange will update context.');
        setSession(newSession); // Optimistically set session; onAuthStateChange will confirm and fetch profile.
        
        return { error: null };

    } catch (error: any) {
        console.error("AuthContext:signUp - CATCH BLOCK EXCEPTION:", error.message);
        return { error: { message: `An unexpected error occurred during sign up: ${error.message}` } };
    } finally {
        console.log("AuthContext:signUp - FINALLY: Setting loading to false.");
        setLoading(false);
    }
  };

  const signInWithPassword = async (params: { email: string; password_hash: string }) => {
    console.log("AuthContext:signInWithPassword - Starting sign in for:", params.email);
    setLoading(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: params.email,
            password: params.password_hash,
        });

        if (error) {
            console.error("AuthContext:signInWithPassword - Supabase auth.signInWithPassword error:", error);
            // setLoading(false) is in finally
            return { error };
        }

        // `onAuthStateChange` will be triggered by `signInWithPassword` if successful.
        // It will set the session, user, and loading state.
        console.log("AuthContext:signInWithPassword - Sign in successful for user:", data.user?.id, ". onAuthStateChange will handle context updates.");
        return { error: null };

    } catch (error: any) {
        console.error("AuthContext:signInWithPassword - CATCH BLOCK EXCEPTION:", error.message);
        return { error: { message: `An unexpected error occurred during sign in: ${error.message}`}};
    } finally {
        console.log("AuthContext:signInWithPassword - FINALLY: Setting loading to false (if not handled by onAuthStateChange sooner).");
        // Although onAuthStateChange should set loading to false, ensure it happens.
        // It might be a race, but finally will catch it.
        setLoading(false); 
    }
  };

  const signOut = async () => {
    console.log("AuthContext:signOut - Signing out user.");
    isSigningOutRef.current = true; // Set flag before calling Supabase
    setLoading(true); // Indicate sign-out process has started

    try {
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
            console.error("AuthContext:signOut - Supabase auth.signOut() error:", signOutError);
            // Error occurred, but we still want to clear local state if possible.
        } else {
            console.log("AuthContext:signOut - Supabase auth.signOut() call successful.");
        }
        
        // Explicitly clear local state immediately after Supabase call,
        // rather than solely relying on onAuthStateChange for quicker UI feedback.
        setUser(null);
        setSession(null);
        console.log("AuthContext:signOut - Local user and session cleared.");

    } catch (error: any) {
        console.error("AuthContext:signOut - CATCH BLOCK EXCEPTION:", error.message);
        // Ensure state is cleared even if an unexpected error occurs during the try block
        setUser(null);
        setSession(null);
    } finally {
        console.log("AuthContext:signOut - FINALLY: Resetting isSigningOutRef and ensuring loading is false.");
        isSigningOutRef.current = false; // Reset flag
        setLoading(false); // Ensure loading is false, onAuthStateChange might also do this.
    }
  };
  
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      console.warn("AuthContext:updateUserProfile - No user logged in. Aborting update.");
      return { data: null, error: { message: 'User not logged in' } };
    }
    console.log("AuthContext:updateUserProfile - Updating profile for user:", user.id, "with updates:", updates);
    setLoading(true);
    try {
        const { data, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        
        if (updateError) {
            console.error('AuthContext:updateUserProfile - Error updating profile in DB:', updateError);
        } else if (data) {
            console.log('AuthContext:updateUserProfile - Profile updated successfully. New data:', data);
            setUser(data as UserProfile); // Update local user state
        }
        return { data: data as UserProfile | null, error: updateError };
    } catch (error: any) {
        console.error("AuthContext:updateUserProfile - CATCH BLOCK EXCEPTION:", error.message);
        return { data: null, error: { message: `An unexpected error occurred while updating profile: ${error.message}` } };
    } finally {
        console.log("AuthContext:updateUserProfile - FINALLY: Setting loading to false.");
        setLoading(false);
    }
  };

  const value = {
    session,
    user,
    loading,
    isResearchLead: user?.role === UserRole.RESEARCH_LEAD,
    isContributor: user?.role === UserRole.CONTRIBUTOR,
    isAdmin: user?.role === UserRole.ADMIN,
    signUp,
    signInWithPassword,
    signOut,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};