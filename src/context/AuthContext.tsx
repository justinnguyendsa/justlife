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
import { doc, getDoc, setDoc, collection, query as fsQuery, where, getDocs } from "firebase/firestore";
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

  const login = async (identifier: string, pass: string) => {
    // Chuyển identifier về định dạng internal nếu không phải email
    const finalEmail = identifier.includes('@') ? identifier : `${identifier.toLowerCase().replace(/\s/g, '')}@justlife.id`;
    const res = await signInWithEmailAndPassword(auth, finalEmail, pass);
    import('../db').then(({ db: localDb }) => {
      localDb.loginLogs.add({
        id: crypto.randomUUID(),
        userId: res.user.uid,
        timestamp: Date.now(),
        type: 'login'
      });
    });
  };

  const register = async (identifier: string, pass: string, name: string) => {
    const isEmail = identifier.includes('@');
    const username = isEmail ? identifier.split('@')[0] : identifier.toLowerCase().replace(/\s/g, '');
    const finalEmail = isEmail ? identifier : `${username}@justlife.id`;

    // 1. Kiểm tra username tồn tại chưa
    const q = fsQuery(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const error = new Error('Tên đăng nhập đã tồn tại.');
      (error as any).code = 'auth/username-already-in-use';
      throw error;
    }

    // 2. Tạo user trong Firebase Auth
    const res = await createUserWithEmailAndPassword(auth, finalEmail, pass);
    await updateProfile(res.user, { displayName: name });

    // 3. Khởi tạo user trong Firestore
    await setDoc(doc(db, "users", res.user.uid), {
      email: isEmail ? finalEmail : null,
      username: username,
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
