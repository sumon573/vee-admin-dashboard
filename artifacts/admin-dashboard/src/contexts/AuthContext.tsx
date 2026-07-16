import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth } from '@/config/firebase';
import { signIn as firebaseSignIn, signOut as firebaseSignOut } from '@/services/authService';
import { getUserById } from '@/services/userService';
import type { AppUser } from '@/types';
import { ADMIN_ROLES } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Raw Firebase Auth user. Null when signed out. */
  user: User | null;
  /** User profile from RTDB (users/{uid}). Null when signed out or loading. */
  appUser: AppUser | null;
  /** True while auth state or user profile is being resolved. */
  loading: boolean;
  /** True when appUser.role is 'admin' or 'superAdmin'. */
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const profile = await getUserById(firebaseUser.uid);
          setAppUser(profile);
        } catch {
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await firebaseSignIn(email, password);
      // onAuthStateChanged will handle the rest
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut();
    setUser(null);
    setAppUser(null);
  };

  const isAdmin = appUser ? ADMIN_ROLES.includes(appUser.role) : false;

  return (
    <AuthContext.Provider
      value={{ user, appUser, loading, isAdmin, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/** Access the auth context. Must be used inside <AuthProvider>. */
export function useAppAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAppAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}
