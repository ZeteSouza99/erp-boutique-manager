'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Usuario, PerfilUsuario } from '@/types';

// Funções para gerenciar cookie de sessão (usado pelo middleware)
function setAuthCookie(token: string) {
  // Cookie expira em 7 dias
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `auth-token=${token}; path=/; expires=${expires}; SameSite=Strict`;
}

function removeAuthCookie() {
  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// Funções para gerenciar cookie de role (usado pelo middleware para controle de acesso)
function setRoleCookie(role: string) {
  // Mesma expiração do auth-token: 7 dias
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `auth-role=${role}; path=/; expires=${expires}; SameSite=Strict`;
}

function removeRoleCookie() {
  document.cookie = 'auth-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  userData: Usuario | null; // Alias para compatibilidade
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string, perfil: PerfilUsuario) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isGerente: boolean;
  isVendedor: boolean;
  canDiscount: (percentual: number) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Limites de desconto por perfil
const DESCONTO_LIMITES: Record<PerfilUsuario, number> = {
  admin: 100,
  gerente: 20,
  vendedor: 10,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Setar cookie para o middleware de autenticação
        const token = await firebaseUser.getIdToken();
        setAuthCookie(token);
        
        // Buscar dados do usuário no Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Helper para converter Timestamp do Firebase para Date
          const toDate = (field: unknown): Date => {
            if (!field) return new Date();
            if (field instanceof Date) return field;
            if (typeof field === 'object' && 'toDate' in field && typeof (field as { toDate: () => Date }).toDate === 'function') {
              return (field as { toDate: () => Date }).toDate();
            }
            return new Date();
          };
          
          setUsuario({
            id: firebaseUser.uid,
            ...userData,
            createdAt: toDate(userData.createdAt),
            updatedAt: toDate(userData.updatedAt),
            ultimoAcesso: toDate(userData.ultimoAcesso),
          } as Usuario);

          // Setar cookie de role para o middleware de controle de acesso
          setRoleCookie(userData.perfil as string);
          
          // Atualizar último acesso (sem await para não bloquear)
          setDoc(doc(db, 'usuarios', firebaseUser.uid), {
            ...userData,
            ultimoAcesso: new Date(),
          }, { merge: true }).catch(console.error);
        }
      } else {
        // Remover cookies ao deslogar
        removeAuthCookie();
        removeRoleCookie();
        setUsuario(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nome: string, _perfil: PerfilUsuario) => {
    setLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

      // Criar documento do usuário no Firestore
      // Segurança: novos usuários são sempre criados como 'vendedor'.
      // Alteração de perfil (role) deve ser feita por um admin via /configuracoes.
      const novoUsuario: Omit<Usuario, 'id'> = {
        nome,
        email,
        perfil: 'vendedor',
        status: 'ativo',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'usuarios', newUser.uid), novoUsuario);
    } finally {
      setLoading(false);
    }
  };

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      removeAuthCookie();
      removeRoleCookie();
      await firebaseSignOut(auth);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAdmin = usuario?.perfil === 'admin';
  const isGerente = usuario?.perfil === 'gerente' || isAdmin;
  const isVendedor = usuario?.perfil === 'vendedor' || isGerente;

  const canDiscount = (percentual: number): boolean => {
    if (!usuario) return false;
    return percentual <= DESCONTO_LIMITES[usuario.perfil];
  };

  return (
    <AuthContext.Provider value={{
      user,
      usuario,
      userData: usuario, // Alias para compatibilidade
      loading,
      signIn,
      signUp,
      signOut,
      isAdmin,
      isGerente,
      isVendedor,
      canDiscount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
