'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Eye, EyeOff, Store, UserPlus, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, signUpSchema, type LoginFormData, type SignUpFormData } from '@/lib/validations';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const { signIn, signUp, user, loading } = useAuth();
  const router = useRouter();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { nome: '', email: '', password: '', confirmPassword: '', perfil: 'admin' },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async (data: LoginFormData) => {
    setError('');
    setIsLoading(true);

    try {
      await signIn(data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Erro:', err);
      if (err instanceof Error) {
        if (err.message.includes('invalid-credential') || err.message.includes('wrong-password')) {
          setError('Email ou senha incorretos');
        } else if (err.message.includes('user-not-found')) {
          setError('Usuário não encontrado');
        } else if (err.message.includes('too-many-requests')) {
          setError('Muitas tentativas. Tente novamente em alguns minutos.');
        } else {
          setError('Erro ao fazer login.');
        }
      } else {
        setError('Erro ao fazer login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setError('');
    setIsLoading(true);

    try {
      await signUp(data.email, data.password, data.nome, data.perfil);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Erro:', err);
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('Este email já está cadastrado');
        } else if (err.message.includes('weak-password')) {
          setError('A senha deve ter pelo menos 6 caracteres');
        } else if (err.message.includes('too-many-requests')) {
          setError('Muitas tentativas. Tente novamente em alguns minutos.');
        } else {
          setError('Erro ao criar conta.');
        }
      } else {
        setError('Erro ao criar conta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Store className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Boutique Manager</CardTitle>
          <CardDescription>
            {isSignUp ? 'Criar nova conta de administrador' : 'Sistema de Gestão para Loja de Roupas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Nome"
                type="text"
                placeholder="Seu nome completo"
                {...signUpForm.register('nome')}
                error={signUpForm.formState.errors.nome?.message}
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                {...signUpForm.register('email')}
                error={signUpForm.formState.errors.email?.message}
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...signUpForm.register('password')}
                  error={signUpForm.formState.errors.password?.message}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Input
                label="Confirmar Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...signUpForm.register('confirmPassword')}
                error={signUpForm.formState.errors.confirmPassword?.message}
                autoComplete="new-password"
              />

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select
                  {...signUpForm.register('perfil')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Administrador</option>
                  <option value="gerente">Gerente</option>
                  <option value="vendedor">Vendedor</option>
                </select>
                {signUpForm.formState.errors.perfil && (
                  <p className="mt-1 text-sm text-red-600">{signUpForm.formState.errors.perfil.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Conta
              </Button>
            </form>
          ) : (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                {...loginForm.register('email')}
                error={loginForm.formState.errors.email?.message}
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  error={loginForm.formState.errors.password?.message}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                loginForm.reset();
                signUpForm.reset();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {isSignUp ? 'Já tenho uma conta - Fazer login' : 'Primeiro acesso? Criar conta'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
