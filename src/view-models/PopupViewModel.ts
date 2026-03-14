/**
 * VIEWMODEL: Popup View Model
 *
 * NOTE: Manages the state and logic for the extension popup UI.
 * NOTE: This is a placeholder implementation that can be expanded.
 */

import { logger } from '../shared/utils/logger';

export interface PopupState {
  enabled: boolean;
  version: string;
  requireRpPrefix: boolean;
}

export interface ExtensionSettings {
  enabled?: boolean;
  requireRpPrefix?: boolean;
}

const STORAGE_KEY = 'mbgSettings';

export class PopupViewModel {
  private state: PopupState;

  constructor() {
    this.state = {
      enabled: true,
      version: chrome.runtime?.getManifest?.()?.version || '1.0.0',
      requireRpPrefix: false
    };
    logger.debug('PopupViewModel created');
  }

  /**
   * VIEWMODEL: Initialize the popup view model
   */
  async initialize(): Promise<void> {
    // Load settings from chrome.storage
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const settings: ExtensionSettings = result[STORAGE_KEY] || {};
      logger.info('Loaded settings:', settings);

      if (settings.enabled !== undefined) {
        this.state.enabled = settings.enabled;
      }
      if (settings.requireRpPrefix !== undefined) {
        this.state.requireRpPrefix = settings.requireRpPrefix;
      }
    } catch (error) {
      logger.error('Failed to load settings', { error });
    }

    logger.info('PopupViewModel initialized');
  }

  /**
   * VIEWMODEL: Get the current state
   */
  getState(): PopupState {
    return { ...this.state };
  }

  /**
   * VIEWMODEL: Set whether the extension is enabled
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.state.enabled = enabled;
    await this.saveSettings({ enabled });
    logger.info(`Extension ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * VIEWMODEL: Set whether to require Rp prefix
   */
  async setRequireRpPrefix(requireRpPrefix: boolean): Promise<void> {
    this.state.requireRpPrefix = requireRpPrefix;
    await this.saveSettings({ requireRpPrefix });
    logger.info(`Require Rp prefix: ${requireRpPrefix}`);
  }

  /**
   * VIEWMODEL: Get the extension version
   */
  getVersion(): string {
    return this.state.version;
  }

  /**
   * VIEWMODEL: Check if the extension is enabled
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }

  /**
   * VIEWMODEL: Check if Rp prefix is required
   */
  isRequireRpPrefix(): boolean {
    return this.state.requireRpPrefix;
  }

  /**
   * VIEWMODEL: Save settings to chrome.storage
   */
  private async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      // Get current settings and merge with new settings
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const currentSettings: ExtensionSettings = result[STORAGE_KEY] || {};
      const updatedSettings = { ...currentSettings, ...settings };

      await chrome.storage.local.set({ [STORAGE_KEY]: updatedSettings });
      logger.debug('Settings saved', updatedSettings);
    } catch (error) {
      logger.error('Failed to save settings', { error });
    }
  }

  /**
   * VIEWMODEL: Destroy the view model and clean up
   */
  destroy(): void {
    logger.debug('PopupViewModel destroyed');
  }
}
