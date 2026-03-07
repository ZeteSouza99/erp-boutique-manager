// Middleware de autenticação Next.js
// Bloqueia rotas protegidas antes do rendering, sem flash de conteúdo

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = ['/login', '/'];

// Rotas restritas por perfil (role-based access control)
const ADMIN_ROUTES = ['/configuracoes'];
const GERENTE_ROUTES = ['/relatorios', '/trocas'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos e API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // arquivos com extensão (favicon, etc)
  ) {
    return NextResponse.next();
  }

  // Verificar se há token de autenticação
  // Firebase Auth usa localStorage no cliente, mas podemos verificar cookie de sessão
  // Para uma solução completa, seria necessário Firebase Admin SDK em API route
  // Por ora, usamos um cookie de sessão básico que será setado pelo AuthContext
  const authToken = request.cookies.get('auth-token')?.value;

  // Rotas públicas - sempre permitir
  if (PUBLIC_ROUTES.includes(pathname)) {
    // Se já está autenticado e tenta acessar login, redireciona para dashboard
    if (authToken && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Rotas protegidas - verificar autenticação
  if (!authToken) {
    // Salvar URL de destino para redirect após login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificação de roles via cookie auth-role (setado pelo AuthContext)
  const authRole = request.cookies.get('auth-role')?.value;

  // Rotas exclusivas de admin — apenas perfil 'admin' pode acessar
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && authRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Rotas de gerente — perfis 'admin' e 'gerente' podem acessar
  if (GERENTE_ROUTES.some(r => pathname.startsWith(r)) && !['admin', 'gerente'].includes(authRole || '')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
