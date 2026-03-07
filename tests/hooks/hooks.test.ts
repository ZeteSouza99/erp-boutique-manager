// Testes de Hooks - Custom Hooks

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useDebounce } from '@/hooks';

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('retorna valor inicial quando não há valor armazenado', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  test('armazena valor no localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorageMock.getItem('test-key')).toBe(JSON.stringify('new value'));
  });

  test('recupera valor existente do localStorage', () => {
    localStorageMock.setItem('existing-key', JSON.stringify('stored value'));

    const { result } = renderHook(() => useLocalStorage('existing-key', 'default'));
    expect(result.current[0]).toBe('stored value');
  });

  test('remove valor', () => {
    const { result } = renderHook(() => useLocalStorage('remove-key', 'value'));

    act(() => {
      result.current[2](); // remove function
    });

    expect(localStorageMock.getItem('remove-key')).toBeNull();
  });
});

describe('useDebounce', () => {
  jest.useFakeTimers();

  test('retorna valor inicial imediatamente', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  test('debounce o valor após delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Ainda não mudou

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });
});
