import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'local' | 'google';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session
    const savedUser = localStorage.getItem('justlife_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, _pass: string) => {
    // Mock login logic
    const mockUser: User = {
      id: '1',
      email,
      name: email.split('@')[0],
      provider: 'local'
    };
    setUser(mockUser);
    localStorage.setItem('justlife_user', JSON.stringify(mockUser));
  };

  const register = async (email: string, _pass: string, name: string) => {
    // Mock register logic
    const mockUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      provider: 'local'
    };
    setUser(mockUser);
    localStorage.setItem('justlife_user', JSON.stringify(mockUser));
  };

  const googleLogin = async () => {
    // Mock Google Login
    const mockUser: User = {
      id: 'google-1',
      email: 'user@google.com',
      name: 'Google User',
      avatar: 'https://lh3.googleusercontent.com/a/default-user',
      provider: 'google'
    };
    setUser(mockUser);
    localStorage.setItem('justlife_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('justlife_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
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
