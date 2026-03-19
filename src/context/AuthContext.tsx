import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Lấy role từ Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          let role: UserRole = 'user';
          
          if (userDoc.exists()) {
            role = userDoc.data().role as UserRole;
          } else {
            // Check if this is the first user (for local dev convenience)
            if (firebaseUser.email === 'admin@justlife.com' || firebaseUser.uid === 'some-hardcoded-id') {
               role = 'super_admin'; 
            }
            
            try {
              await setDoc(doc(db, "users", firebaseUser.uid), {
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'User',
                role: role,
                createdAt: Date.now()
              });
            } catch (fsError) {
              console.warn("Firestore setDoc failed, proceeding with default role:", fsError);
            }
          }

          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            avatar: firebaseUser.photoURL || undefined,
            provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
            role: role
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth sync error:", err);
        // Fallback: stay at null or set minimal user if auth exists
        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            avatar: firebaseUser.photoURL || undefined,
            provider: 'google',
            role: 'user'
          });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { displayName: name });
    
    // Khởi tạo user trong Firestore
    await setDoc(doc(db, "users", res.user.uid), {
      email,
      name,
      role: 'user',
      createdAt: Date.now()
    });
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => {
    signOut(auth);
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    await setDoc(doc(db, "users", uid), { role: newRole }, { merge: true });
    if (user?.id === uid) {
      setUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
