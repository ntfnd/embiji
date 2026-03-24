/**
 * MODEL: DOM Observer Service
 *
 * NOTE: Service that wraps the MutationObserver API for observing DOM changes.
 * NOTE: Notifies a callback when mutations occur, with debouncing to prevent
 * NOTE: excessive calls during rapid DOM changes.
 */

import type { ObserverConfig } from '../types'
import { logger } from '../../shared/utils/logger'

export class DomObserver {
    private readonly callback: () => void
    private readonly config: ObserverConfig
    private observer: MutationObserver | null = null
    private debounceTimer: ReturnType<typeof setTimeout> | null = null
    private readonly debounceDelay = 100

    constructor(callback: () => void, config?: Partial<ObserverConfig>) {
        this.callback = callback
        this.config = {
            childList: true,
            subtree: true,
            ...config
        }
        logger.debug('DomObserver created')
    }

    /**
   * MODEL: Start observing the document body for mutations
   */
    start(): void {
        if (this.observer) {
            logger.warn('DomObserver already running')
            return
        }

        if (!document.body) {
            logger.error('Cannot start DomObserver: document.body not available')
            return
        }

        this.observer = new MutationObserver(() => {
            this.onMutation()
        })

        this.observer.observe(document.body, this.config)
        logger.debug('DomObserver started')
    }

    /**
   * MODEL: Stop observing for mutations
   */
    stop(): void {
        this.observer && (this.observer.disconnect(), this.observer = null, logger.debug('DomObserver stopped'))
        this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null)
    }

    /**
   * MODEL: Check if the observer is currently running
   */
    isRunning(): boolean {
        return this.observer !== null
    }

    /**
   * MODEL: Get the observer configuration
   */
    getConfig(): ObserverConfig {
        return { ...this.config }
    }

    /**
   * MODEL: Handle mutation events with debouncing
   */
    private onMutation(): void {
        this.debounceTimer && clearTimeout(this.debounceTimer)

        this.debounceTimer = setTimeout(() => {
            try {
                this.callback()
            } catch (error) {
                logger.error('Error in DomObserver callback', {
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }, this.debounceDelay)
    }

    /**
   * MODEL: Destroy the observer and clean up
   */
    destroy(): void {
        this.stop()
        logger.debug('DomObserver destroyed')
    }
}
