import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User 
} from 'firebase/auth';
import { auth } from '../firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isGuest?: boolean;
}

interface AuthContextType {
  currentUser: AppUser | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  guestLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const GUEST_KEY = 'scge_guest_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if there was an active guest session
    const guestData = localStorage.getItem(GUEST_KEY);
    if (guestData) {
      try {
        const parsed = JSON.parse(guestData);
        setCurrentUser(parsed);
        setIsLoading(false);
      } catch (e) {
        localStorage.removeItem(GUEST_KEY);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        localStorage.removeItem(GUEST_KEY);
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Entregador',
          isGuest: false
        });
      } else {
        // Only set null if not currently a guest
        if (!localStorage.getItem(GUEST_KEY)) {
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      localStorage.removeItem(GUEST_KEY);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setCurrentUser({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Entregador',
        isGuest: false
      });
      return { success: true };
    } catch (err: any) {
      let message = 'Erro ao realizar login.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de e-mail inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas. Tente novamente mais tarde.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Falha de conexão com a internet.';
      }
      return { success: false, error: message };
    }
  };

  const register = async (email: string, pass: string) => {
    try {
      localStorage.removeItem(GUEST_KEY);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      setCurrentUser({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Entregador',
        isGuest: false
      });
      return { success: true };
    } catch (err: any) {
      let message = 'Erro ao criar conta.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está cadastrado.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve conter no mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      }
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { 
        success: true, 
        message: 'Link de redefinição enviado com sucesso para seu e-mail!' 
      };
    } catch (err: any) {
      let message = 'Erro ao enviar e-mail de recuperação.';
      if (err.code === 'auth/user-not-found') {
        message = 'Nenhuma conta encontrada com este e-mail.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      }
      return { success: false, error: message };
    }
  };

  const guestLogin = () => {
    const guestUser: AppUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: 'entregador.demo@scge.com',
      displayName: 'Piloto Convidado',
      isGuest: true
    };
    localStorage.setItem(GUEST_KEY, JSON.stringify(guestUser));
    setCurrentUser(guestUser);
  };

  const logout = async () => {
    try {
      localStorage.removeItem(GUEST_KEY);
      await signOut(auth);
    } catch (err) {
      console.warn('Aviso durante signOut Firebase:', err);
    } finally {
      // Always reset local state to ensure smooth return to index screen
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isLoading, 
      login, 
      register, 
      resetPassword, 
      guestLogin, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
