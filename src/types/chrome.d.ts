/**
 * Chrome Extension API Type Declarations
 */

interface StorageChange {
    oldValue?: unknown
    newValue?: unknown
}

interface Manifest {
    name: string
    version: string
    [key: string]: unknown
}

declare const chrome: {
    runtime: {
        getURL(path: string): string
        getManifest(): Manifest
        id: string
        onMessage: {
            addListener(
                callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => void
            ): void
        }
    }
    storage: {
        local: {
            get(keys: string | string[] | object | null): Promise<{ [key: string]: unknown }>
            set(items: { [key: string]: unknown }): Promise<void>
        }
        onChanged: {
            addListener(
                callback: (changes: { [key: string]: { oldValue?: unknown; newValue?: unknown } }) => void
            ): void
            removeListener(
                callback: (changes: { [key: string]: { oldValue?: unknown; newValue?: unknown } }) => void
            ): void
        }
    }
}

declare module '*.svg' {
    const content: string
    export default content
}

declare module '*.png' {
    const content: string
    export default content
}

declare module '*.jpg' {
    const content: string
    export default content
}

declare module '*.json' {
    const content: string
    export default content
}
