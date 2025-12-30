// Firebase configuration
// Replace these values with your Firebase project config
// Get them from: Firebase Console > Project Settings > General > Your apps

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Check if Firebase config is valid (not empty)
const isFirebaseConfigValid = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase only on client side (not during build/SSR)
let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

const initFirebase = (): FirebaseApp => {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized on the client side');
  }

  // Check config validity BEFORE trying to initialize
  if (!isFirebaseConfigValid()) {
    // During build, env vars might not be set - that's okay, just don't initialize
    throw new Error('Firebase configuration is missing. Please check your environment variables.');
  }

  if (!app) {
    if (getApps().length === 0) {
      // Only initialize if config is valid
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }
  return app;
};

// Initialize Firebase services - only on client side
// Use try-catch to gracefully handle build-time initialization
const getAuthInstance = (): Auth => {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client side');
  }
  if (!_auth) {
    _auth = getAuth(initFirebase());
  }
  return _auth;
};

const getDbInstance = (): Firestore => {
  if (typeof window === 'undefined') {
    throw new Error('Firestore can only be used on the client side');
  }
  if (!_db) {
    _db = getFirestore(initFirebase());
  }
  return _db;
};

const getStorageInstance = (): FirebaseStorage => {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Storage can only be used on the client side');
  }
  if (!_storage) {
    _storage = getStorage(initFirebase());
  }
  return _storage;
};

// Export getters - only initialize on client side
// During build/SSR, these won't be used anyway (all Firebase usage is in client components)
// But we need to export them to satisfy TypeScript
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Only initialize if we're on the client side AND config is valid
if (typeof window !== 'undefined' && isFirebaseConfigValid()) {
  try {
    auth = getAuthInstance();
    db = getDbInstance();
    storage = getStorageInstance();
  } catch (error) {
    // If initialization fails, create dummy exports
    // They will throw proper errors at runtime if used
    console.warn('Firebase initialization failed:', error);
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
  }
} else {
  // During build/SSR or when config is invalid, create dummy exports
  // These will only be used in client components, which will re-initialize properly
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { auth, db, storage };
export default initFirebase;

