// Test setup file for Vitest
import { vi } from 'vitest';

// Mock Chrome API
(globalThis as any).chrome = {
  runtime: {
    getManifest: vi.fn(() => ({
      name: 'Test Extension',
      version: '1.0.0'
    })),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    sendMessage: vi.fn()
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  },
  scripting: {
    executeScript: vi.fn()
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});
