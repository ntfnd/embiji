/**
 * Tests for PopupViewModel
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PopupViewModel } from '../../../src/view-models/PopupViewModel';

describe('PopupViewModel', () => {
  let viewModel: PopupViewModel;

  beforeEach(() => {
    viewModel = new PopupViewModel();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(viewModel).toBeInstanceOf(PopupViewModel);
    });

    it('should initialize with default state', () => {
      const state = viewModel.getState();
      expect(state).toEqual({
        enabled: true,
        version: expect.any(String),
        requireRpPrefix: false
      });
    });
  });

  describe('initialize', () => {
    it('should initialize the view model', async () => {
      await expect(viewModel.initialize()).resolves.not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = viewModel.getState();
      expect(state).toHaveProperty('enabled');
      expect(state).toHaveProperty('version');
      expect(state).toHaveProperty('requireRpPrefix');
    });
  });

  describe('setEnabled', () => {
    it('should set enabled state', () => {
      viewModel.setEnabled(false);
      expect(viewModel.getState().enabled).toBe(false);

      viewModel.setEnabled(true);
      expect(viewModel.getState().enabled).toBe(true);
    });
  });

  describe('getVersion', () => {
    it('should return version string', () => {
      const version = viewModel.getVersion();
      expect(typeof version).toBe('string');
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      expect(() => viewModel.destroy()).not.toThrow();
    });
  });
});
