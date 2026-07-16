import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth } from '@/config/firebase';

/**
 * Sign in with email and password.
 * Throws FirebaseAuthError on bad credentials.
 */
export async function signIn(email: string, password: string): Promise<void> {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign the current user out.
 */
export async function signOut(): Promise<void> {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  await firebaseSignOut(auth);
}
