import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null | undefined;
  loading: boolean;
  dbLoading: boolean;
  refreshDbUser: () => Promise<User | null>;
  createUserProfile: (firebaseUser: FirebaseUser, additionalData?: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);

  const fetchDbUser = async (uid: string) => {
    setDbLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        setDbUser(data);
        // Update presence
        try {
          await updateDoc(doc(db, 'users', uid), { lastActive: Date.now() });
        } catch (e) {
          console.error("Failed to update presence", e);
        }
        return data;
      } else {
        setDbUser(null);
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch user data from Firestore", error);
      setDbUser(null);
      return null;
    } finally {
      setDbLoading(false);
    }
  };

  const refreshDbUser = async () => {
    if (user) return await fetchDbUser(user.uid);
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchDbUser(firebaseUser.uid);
      } else {
        setUser(null);
        setDbUser(null);
        setDbLoading(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserProfile = async (firebaseUser: FirebaseUser, additionalData: Partial<User> = {}) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const isStaff = additionalData.role === 'admin' || additionalData.role === 'lead_admin';
    
    const userData: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
      photoURL: firebaseUser.photoURL || '',
      university: '',
      whatsapp: '',
      joinedAt: Date.now(),
      role: 'student',
      verificationStatus: isStaff ? 'approved' : 'unverified',
      ...additionalData
    };
    await setDoc(userDocRef, userData);
    setDbUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, dbLoading, refreshDbUser, createUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
