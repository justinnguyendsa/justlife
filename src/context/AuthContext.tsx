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
            // Mọi user mới mặc định là 'user'. 
            // Bạn có thể đổi quyền Super Admin trực tiếp trong Firebase Console > Firestore cho tài khoản đầu tiên.
            role = 'user'; 

            try {
              await setDoc(doc(db, "users", firebaseUser.uid), {
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'User',
                role: role,
                createdAt: Date.now()
              });
            } catch (fsError) {
              console.warn("Firestore setDoc failed:", fsError);
            }
          }

          const userProfile: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            avatar: firebaseUser.photoURL || undefined,
            provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
            role: role
          };

          setUser(userProfile);
          
          // Luôn đồng bộ vào Local DB để truy xuất nhanh và offline
          import('../db').then(({ db: localDb }) => {
            localDb.users.put({ ...userProfile });
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
    const res = await signInWithEmailAndPassword(auth, email, pass);
    import('../db').then(({ db: localDb }) => {
      localDb.loginLogs.add({
        id: crypto.randomUUID(),
        userId: res.user.uid,
        timestamp: Date.now(),
        type: 'login'
      });
    });
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
    const uid = user?.id;
    signOut(auth);
    if (uid) {
      import('../db').then(({ db: localDb }) => {
        localDb.loginLogs.add({
          id: crypto.randomUUID(),
          userId: uid,
          timestamp: Date.now(),
          type: 'logout'
        });
      });
    }
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
