import { logger } from '../shared/utils/logger'

export interface PopupState {
    enabled: boolean;
    version: string;
    requireRpPrefix: boolean;
}

export interface ExtensionSettings {
    enabled?: boolean;
    requireRpPrefix?: boolean;
    [key: string]: unknown
}

const STORAGE_KEY = 'mbgSettings'

export class PopupViewModel {
    private state: PopupState

    constructor() {
        this.state = {
            enabled: true,
            version: chrome.runtime?.getManifest?.()?.version || '1.0.0',
            requireRpPrefix: false
        }
        logger.debug('PopupViewModel created')
    }

    async initialize(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY)
            const settings: ExtensionSettings = (result[STORAGE_KEY] || {}) as ExtensionSettings
            logger.info('Loaded settings:', settings)

            if (settings.enabled !== undefined) {
                this.state.enabled = settings.enabled
            }
            if (settings.requireRpPrefix !== undefined) {
                this.state.requireRpPrefix = settings.requireRpPrefix
            }
        } catch (error) {
            logger.error('Failed to load settings', { error })
        }

        logger.info('PopupViewModel initialized')
    }

    getState(): PopupState {
        return { ...this.state }
    }

    async setEnabled(enabled: boolean): Promise<void> {
        this.state.enabled = enabled
        await this.saveSettings({ enabled })
        logger.info(`Extension ${enabled ? 'enabled' : 'disabled'}`)
    }

    async setRequireRpPrefix(requireRpPrefix: boolean): Promise<void> {
        this.state.requireRpPrefix = requireRpPrefix
        await this.saveSettings({ requireRpPrefix })
        logger.info(`Require Rp prefix: ${requireRpPrefix}`)
    }

    getVersion(): string {
        return this.state.version
    }

    isEnabled(): boolean {
        return this.state.enabled
    }

    isRequireRpPrefix(): boolean {
        return this.state.requireRpPrefix
    }

    private async saveSettings(settings: ExtensionSettings): Promise<void> {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY)
            const currentSettings: ExtensionSettings = (result[STORAGE_KEY] || {}) as ExtensionSettings
            const updatedSettings = { ...currentSettings, ...settings }

            await chrome.storage.local.set({ [STORAGE_KEY]: updatedSettings })
            logger.debug('Settings saved', updatedSettings)
        } catch (error) {
            logger.error('Failed to save settings', { error })
        }
    }

    destroy(): void {
        logger.debug('PopupViewModel destroyed')
    }
}
