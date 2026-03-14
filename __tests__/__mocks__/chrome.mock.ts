/**
 * Chrome API Mock for Testing
 *
 * This file provides mock implementations of Chrome Extension APIs
 * for unit and integration testing.
 */

import { vi } from 'vitest';

export const mockChrome = {
  runtime: {
    getManifest: vi.fn(() => ({
      name: 'Test Extension',
      version: '1.0.0',
      description: 'Test Description'
    })),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    id: 'test-extension-id'
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  },
  scripting: {
    executeScript: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn()
    }
  }
};

/**
 * Sets up the Chrome API mock on globalThis
 */
export function setupChromeMock(): void {
  (globalThis as any).chrome = mockChrome;
}

/**
 * Clears all Chrome API mock call history
 */
export function clearChromeMocks(): void {
  mockChrome.runtime.getManifest.mockClear();
  mockChrome.runtime.sendMessage.mockClear();
  mockChrome.tabs.query.mockClear();
  mockChrome.tabs.sendMessage.mockClear();
  mockChrome.scripting.executeScript.mockClear();
  mockChrome.storage.local.get.mockClear();
  mockChrome.storage.local.set.mockClear();
}
