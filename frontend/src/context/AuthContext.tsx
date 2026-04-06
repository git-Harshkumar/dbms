import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loginUser, registerUser } from '../api/auth.api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: 'student' | 'admin') => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isStudent: boolean;
  isLoggedIn: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // true until we check localStorage

  // On app load — restore user from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser) as User);
    }
    setLoading(false);
  }, []);

  // ── Login ──────────────────────────────────────────
  const login = async (email: string, password: string): Promise<User> => {
    const res = await loginUser({ email, password });
    const { token: newToken, user: newUser } = res.data as { token: string; user: User };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user',  JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    return newUser; // caller can redirect based on role
  };

  // ── Register ───────────────────────────────────────
  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'student' | 'admin' = 'student'
  ): Promise<User> => {
    const res = await registerUser({ name, email, password, role });
    const { token: newToken, user: newUser } = res.data as { token: string; user: User };

    localStorage.setItem('token', newToken);
    localStorage.setItem('user',  JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  // ── Logout ─────────────────────────────────────────
  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // ── Helpers ────────────────────────────────────────
  const isAdmin   = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAdmin,
      isStudent,
      isLoggedIn,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — use this anywhere: const { user, login } = useAuth()
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
};

export default AuthContext;