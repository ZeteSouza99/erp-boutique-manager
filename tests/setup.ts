// Setup de testes - executado antes de cada arquivo de teste

import '@testing-library/jest-dom';

// Mock do Firebase
jest.mock('@/lib/firebase/config', () => ({
  app: {},
  db: {},
  auth: {},
  storage: {},
}));

// Mock do Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock do AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@test.com',
      nome: 'Test User',
      perfil: 'admin',
    },
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Suprimir warnings do console em testes
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
