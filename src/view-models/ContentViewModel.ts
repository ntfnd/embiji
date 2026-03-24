/**
 * VIEWMODEL: Content View Model
 *
 * NOTE: Converts Indonesian Rupiah money text to MBG (Makan Bergizi Gratis) time units.
 */

import { DomObserver } from '../core/services/DomObserver'
import { MBGConverter, MBGConverterConfig } from '../core/services/MBGConverter'
import { TimeUnit } from '../common/constants'
import { logger, LogLevel } from '../shared/utils/logger'

const DEBUG_MODE = true

const STORAGE_KEY = 'mbgSettings'

interface ExtensionSettings {
    enabled?: boolean;
    requireRpPrefix?: boolean;
    [key: string]: unknown
}

export class ContentViewModel {
    private readonly observer: DomObserver
    private mbgConverter: MBGConverter
    private initialized = false
    private convertedTextNodes = new Set<Text>()
    private escapeHandlerRegistered = false
    private enabled = true // Track enabled state
    private storageListener?: ((changes: { [key: string]: StorageChange }) => void)

    constructor(observer?: DomObserver, mbgConverter?: MBGConverter) {
        this.observer = observer || new DomObserver(() => this.onMutation())
        // Default config, will be updated from storage
        const defaultConfig: MBGConverterConfig = { requireRpPrefix: false }
        this.mbgConverter = mbgConverter || new MBGConverter(defaultConfig)
        logger.setLevel(LogLevel.INFO)
        logger.debug('ContentViewModel created')
    }

    /**
   * VIEWMODEL: Load settings from chrome.storage
   */
    private async loadSettings(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY)
            const settings: ExtensionSettings = (result[STORAGE_KEY] || {}) as ExtensionSettings

            // Update enabled state
            if (settings.enabled !== undefined) {
                this.enabled = settings.enabled
                logger.info('Extension enabled:', { enabled: this.enabled })
            }

            // Update MBGConverter config if requireRpPrefix changed
            if (settings.requireRpPrefix !== undefined) {
                const currentConfig = this.mbgConverter.getConfig()
                if (currentConfig.requireRpPrefix !== settings.requireRpPrefix) {
                    this.mbgConverter = new MBGConverter({ requireRpPrefix: settings.requireRpPrefix })
                    logger.info('Updated requireRpPrefix:', { requireRpPrefix: settings.requireRpPrefix })
                }
            }
        } catch (error) {
            logger.error('Failed to load settings', { error })
        }
    }

    /**
   * VIEWMODEL: Listen for storage changes
   */
    private setupStorageListener(): void {
        this.storageListener = (changes) => {
            if (changes[STORAGE_KEY]) {
                const newSettings = changes[STORAGE_KEY].newValue as ExtensionSettings
                const oldSettings = changes[STORAGE_KEY].oldValue as ExtensionSettings

                // Check if enabled state changed
                if (newSettings?.enabled !== undefined && newSettings.enabled !== oldSettings?.enabled) {
                    this.enabled = newSettings.enabled
                    logger.info('Extension enabled state changed:', { enabled: this.enabled })

                    if (this.enabled) {
                        // Re-enable processing
                        this.processMBG()
                    } else {
                        // Remove all MBG elements
                        this.removeAllMBGElements()
                    }
                }

                // Check if requireRpPrefix changed
                if (newSettings?.requireRpPrefix !== undefined && newSettings.requireRpPrefix !== oldSettings?.requireRpPrefix) {
                    this.mbgConverter = new MBGConverter({ requireRpPrefix: newSettings.requireRpPrefix })
                    logger.info('RequireRpPrefix changed:', { requireRpPrefix: newSettings.requireRpPrefix })
                    // Re-process if enabled
                    if (this.enabled) {
                        this.removeAllMBGElements()
                        this.processMBG()
                    }
                }
            }
        }

        chrome.storage.onChanged.addListener(this.storageListener)
    }

    /**
   * VIEWMODEL: Remove all MBG elements from the page
   */
    private removeAllMBGElements(): void {
    // Remove all MBG markers
        const markers = document.querySelectorAll('.mbg-marker')
        markers.forEach(marker => {
            const parent = marker.parentNode
            if (parent) {
                // Get the original text content
                const originalText = marker.querySelector('.mbg-original')?.textContent || marker.textContent || ''
                // Replace with plain text node
                const textNode = document.createTextNode(originalText)
                parent.replaceChild(textNode, marker)
                // Merge adjacent text nodes
                parent.normalize()
            }
        })

        // Clear converted text nodes tracking
        this.convertedTextNodes.clear()

        // Remove popover if exists
        const popover = document.querySelector('.mbg-popover')
        if (popover) {
            popover.remove()
        }

        logger.debug('Removed all MBG elements')
    }

    /**
   * VIEWMODEL: Initialize the content script
   */
    async initialize(): Promise<void> {
        if (this.initialized) {
            logger.warn('ContentViewModel already initialized')
            return
        }

        console.log('[MBG DEBUG] ContentViewModel initializing...')
        logger.info('Initializing ContentViewModel')

        // Load settings from storage
        await this.loadSettings()

        // Setup storage listener for settings changes
        this.setupStorageListener()

        this.addMBGStyles()

        // Only process if enabled
        if (this.enabled) {
            this.processMBG()
        } else {
            logger.info('Extension is disabled, not processing')
        }

        if (!this.observer.isRunning()) {
            this.observer.start()
        }

        this.initialized = true
        logger.info('ContentViewModel initialized')
    }

    /**
   * VIEWMODEL: Process text nodes for MBG conversion
   * NOTE: Processes text nodes with valid money patterns, including inside buttons/clickable elements
   * NOTE: Only skips script, style, noscript and already converted elements
   * NOTE: Only processes if extension is enabled
   */
    private processMBG(): void {
        if (!this.enabled) {
            logger.debug('Extension is disabled, skipping MBG processing')
            return
        }
        console.log('[MBG DEBUG] processMBG started')
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (this.convertedTextNodes.has(node as Text)) {
                        return NodeFilter.FILTER_REJECT
                    }
                    // Only skip our own elements and non-content elements
                    if (node.parentElement?.closest('.mbg-marker, .mbg-inline, .mbg-popover, script, style, noscript')) {
                        return NodeFilter.FILTER_REJECT
                    }
                    // Still skip input/select/textarea values to avoid breaking form elements
                    if (node.parentElement?.closest('input, select, textarea')) {
                        return NodeFilter.FILTER_REJECT
                    }
                    const text = node.textContent || ''
                    if (text.length < 2) {
                        return NodeFilter.FILTER_REJECT
                    }
                    // Updated regex to include plain numbers with dots as thousand separators (Indonesian format)
                    // e.g., "295.000", "1.000.000" which are typical price formats
                    const hasMoney = /(?:Rp\s*[\d.,]+|[\d.,]+\s*(juta|miliar|triliun|ribu)|juta|miliar|triliun|\d{1,3}(?:\.\d{3}){1,})/i.test(text)
                    if (hasMoney) {
                        DEBUG_MODE && console.log('[MBG DEBUG] Found potential money text:', text)
                        return NodeFilter.FILTER_ACCEPT
                    }
                    return NodeFilter.FILTER_REJECT
                }
            }
        )

        const nodesToProcess: Text[] = []
        let node: Node | null

        while ((node = walker.nextNode())) {
            if (node instanceof Text) {
                nodesToProcess.push(node)
            }
        }

        DEBUG_MODE && console.log('[MBG DEBUG] Text nodes to process:', nodesToProcess.length)

        for (const textNode of nodesToProcess) {
            this.processTextNode(textNode)
        }

        if (nodesToProcess.length > 0) {
            logger.debug(`Processed ${nodesToProcess.length} text nodes for MBG`)
        }
        console.log('[MBG DEBUG] processMBG completed')
    }

    /**
   * VIEWMODEL: Process single text node
   */
    private processTextNode(textNode: Text): void {
        const text = textNode.textContent || ''
        const matches = this.mbgConverter.findMoneyPatterns(text)

        if (matches.length === 0) {
            return
        }

        DEBUG_MODE && console.log('[MBG DEBUG] Processing text:', text, 'matches:', matches)

        this.convertedTextNodes.add(textNode)

        // Check if this text node is inside a clickable element
        const parentElement = textNode.parentElement
        const isInsideClickable = !!parentElement?.closest('button, a, [role="button"], [data-testid="button"]')

        const fragment = document.createDocumentFragment()
        let lastIndex = 0

        for (const match of matches) {
            // Skip matches that overlap with already processed areas
            if (match.startIndex < lastIndex) {
                DEBUG_MODE && console.log('[MBG DEBUG] Skipping overlapping match:', match.originalText, 'at', match.startIndex, 'last processed:', lastIndex)
                continue
            }

            if (match.startIndex > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.startIndex)))
            }

            // Create wrapper for clickable area (includes both original text and inline MBG)
            const wrapper = document.createElement('span')
            wrapper.className = 'mbg-marker'
            wrapper.dataset.amount = match.amount.toString()
            wrapper.dataset.original = match.originalText

            // Original money text
            const textSpan = document.createElement('span')
            textSpan.className = 'mbg-original'
            textSpan.textContent = match.originalText

            // Inline MBG text
            const conversion = this.mbgConverter.convertToMBG(match.amount)
            const mbgText = this.getInlineMBGText(conversion)

            const mbgSpan = document.createElement('span')
            mbgSpan.className = 'mbg-inline'
            mbgSpan.textContent = ` (${mbgText})`

            // Add click handler to wrapper
            wrapper.addEventListener('click', (e) => {
                if (isInsideClickable) {
                    // Inside button: show popover but don't prevent button action
                    this.showMBGPopover(wrapper, match.amount)
                } else {
                    // Not inside button: show popover and prevent default
                    e.preventDefault()
                    e.stopPropagation()
                    this.showMBGPopover(wrapper, match.amount)
                }
            })

            // Append both spans to wrapper
            wrapper.appendChild(textSpan)
            wrapper.appendChild(mbgSpan)

            fragment.appendChild(wrapper)
            lastIndex = match.endIndex
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)))
        }

        textNode.parentNode?.replaceChild(fragment, textNode)
    }

    /**
   * VIEWMODEL: Get inline MBG text (shortest meaningful unit)
   */
    private getInlineMBGText(conversion: {
        perDetik: number;
        perMenit: number;
        perJam: number;
        perHari: number;
        perMinggu: number;
        perBulan: number;
        perTahun: number;
    }): string {
        if (conversion.perTahun >= 1) {
            const value = Number.isInteger(conversion.perTahun)
                ? conversion.perTahun.toLocaleString('id-ID')
                : conversion.perTahun.toFixed(2)
            return `${value} ${TimeUnit.TAHUN} MBG`
        }
        if (conversion.perBulan >= 1) {
            const value = Number.isInteger(conversion.perBulan)
                ? conversion.perBulan.toLocaleString('id-ID')
                : conversion.perBulan.toFixed(2)
            return `${value} ${TimeUnit.BULAN} MBG`
        }
        if (conversion.perMinggu >= 1) {
            const value = Number.isInteger(conversion.perMinggu)
                ? conversion.perMinggu.toLocaleString('id-ID')
                : conversion.perMinggu.toFixed(2)
            return `${value} ${TimeUnit.MINGGU} MBG`
        }
        if (conversion.perHari >= 1) {
            const value = Number.isInteger(conversion.perHari)
                ? conversion.perHari.toLocaleString('id-ID')
                : conversion.perHari.toFixed(2)
            return `${value} ${TimeUnit.HARI} MBG`
        }
        if (conversion.perJam >= 1) {
            const value = Number.isInteger(conversion.perJam)
                ? conversion.perJam.toLocaleString('id-ID')
                : conversion.perJam.toFixed(2)
            return `${value} ${TimeUnit.JAM} MBG`
        }
        if (conversion.perMenit >= 1) {
            const value = Number.isInteger(conversion.perMenit)
                ? conversion.perMenit.toLocaleString('id-ID')
                : conversion.perMenit.toFixed(2)
            return `${value} ${TimeUnit.MENIT} MBG`
        }
        if (conversion.perDetik < 1) {
            return `${conversion.perDetik.toFixed(4)} ${TimeUnit.DETIK} MBG`
        }
        const value = Number.isInteger(conversion.perDetik)
            ? conversion.perDetik.toLocaleString('id-ID')
            : conversion.perDetik.toFixed(2)
        return `${value} ${TimeUnit.DETIK} MBG`
    }

    /**
   * VIEWMODEL: Show MBG popover for element
   */
    private showMBGPopover(element: HTMLElement, amount: number): void {
        const existing = document.querySelector('.mbg-popover')
        if (existing) {
            existing.remove()
        }

        this.createMBGPopover(element, amount)
    }

    /**
   * VIEWMODEL: Create and show MBG popover
   */
    private createMBGPopover(target: HTMLElement, amount: number): void {
        const conversion = this.mbgConverter.convertToMBG(amount)

        const popover = document.createElement('div')
        popover.className = 'mbg-popover'

        const header = document.createElement('div')
        header.className = 'mbg-popover-header'

        const title = document.createElement('div')
        title.className = 'mbg-popover-title'
        title.textContent = `Rp ${amount.toLocaleString('id-ID')}`

        const closeBtn = document.createElement('button')
        closeBtn.className = 'mbg-popover-close'
        closeBtn.textContent = '×'
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            popover.remove()
        })

        header.appendChild(title)
        header.appendChild(closeBtn)

        const subtitle = document.createElement('div')
        subtitle.className = 'mbg-popover-subtitle'
        subtitle.textContent = `= ${this.mbgConverter.formatMBG(conversion)} MBG`

        const details = document.createElement('div')
        details.className = 'mbg-popover-details'

        const detailItems = [
            { label: 'Per Detik', value: conversion.perDetik },
            { label: 'Per Menit', value: conversion.perMenit },
            { label: 'Per Jam', value: conversion.perJam },
            { label: 'Per Hari', value: conversion.perHari },
            { label: 'Per Minggu', value: conversion.perMinggu },
            { label: 'Per Bulan', value: conversion.perBulan },
            { label: 'Per Tahun', value: conversion.perTahun },
        ]

        for (const item of detailItems) {
            const row = document.createElement('div')
            row.className = 'mbg-popover-row'

            const label = document.createElement('span')
            label.className = 'mbg-popover-label'
            label.textContent = item.label + ':'

            const value = document.createElement('span')
            value.className = 'mbg-popover-value'
            value.textContent = this.formatMBGValue(item.value, item.label)

            row.appendChild(label)
            row.appendChild(value)
            details.appendChild(row)
        }

        popover.appendChild(header)
        popover.appendChild(subtitle)
        popover.appendChild(details)

        // Add footer
        const footer = document.createElement('div')
        footer.className = 'mbg-popover-footer'
        footer.innerHTML = `<a href="https://embiji.aksi.dev" target="_blank">embiji.aksi.dev</a> © ${new Date().getFullYear()}`
        popover.appendChild(footer)

        document.body.appendChild(popover)
        this.addMBGStyles()
        this.positionMBGPopover(target, popover)

        if (!this.escapeHandlerRegistered) {
            document.addEventListener('keydown', this.handleEscapeKey)
            this.escapeHandlerRegistered = true
        }

        logger.debug('MBG Popover shown')
    }

    /**
   * VIEWMODEL: Format MBG value for display
   */
    private formatMBGValue(value: number, label: string): string {
        if (label === 'Per Detik' && value < 1) {
            return value.toFixed(4)
        }
        if (Number.isInteger(value)) {
            return value.toLocaleString('id-ID')
        }
        return value.toFixed(2).replace('.', ',')
    }

    /**
   * VIEWMODEL: Position MBG popover near target
   */
    private positionMBGPopover(target: HTMLElement, popover: HTMLElement): void {
        const rect = target.getBoundingClientRect()
        const popoverRect = popover.getBoundingClientRect()

        let top = rect.bottom + 8
        let left = rect.left + (rect.width - popoverRect.width) / 2

        if (left < 8) {
            left = 8
        }
        if (left + popoverRect.width > window.innerWidth - 8) {
            left = window.innerWidth - popoverRect.width - 8
        }
        if (top + popoverRect.height > window.innerHeight - 8) {
            top = rect.top - popoverRect.height - 8
        }

        popover.style.top = `${top}px`
        popover.style.left = `${left}px`
    }

    /**
   * VIEWMODEL: Handle Escape key to close popover
   */
    private handleEscapeKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            const popover = document.querySelector('.mbg-popover')
            if (popover) {
                popover.remove()
            }
        }
    }

    /**
   * VIEWMODEL: Add MBG inline and popover styles
   */
    private addMBGStyles(): void {
        if (document.getElementById('mbg-popover-styles')) {
            return
        }

        const style = document.createElement('style')
        style.id = 'mbg-popover-styles'
        style.textContent = `
      .mbg-marker {
        cursor: pointer;
        border-bottom: 1.5px solid #FFD700;
        transition: background 0.2s;
        display: inline;
      }

      .mbg-marker:hover {
        background: rgba(255, 215, 0, 0.15);
      }

      .mbg-original {
        display: inline;
      }

      .mbg-inline {
        color: #667eea;
        font-weight: bold;
        font-size: 0.9em;
        display: inline;
      }

      .mbg-popover {
        position: fixed;
        z-index: 2147483647;
        background: rgba(0, 32, 96, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 14px;
        padding: 16px;
        min-width: 280px;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
        animation: mbgFadeIn 0.2s ease-out;
        border: 2px solid #FFD700;
      }

      @keyframes mbgFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .mbg-popover-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .mbg-popover-title {
        font-size: 18px;
        font-weight: bold;
      }

      .mbg-popover-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
        line-height: 1;
      }

      .mbg-popover-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .mbg-popover-subtitle {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }

      .mbg-popover-details {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .mbg-popover-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .mbg-popover-label {
        opacity: 0.8;
      }

      .mbg-popover-value {
        font-weight: bold;
        font-size: 14px;
      }

      .mbg-popover-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        text-align: center;
        font-size: 11px;
        opacity: 0.7;
      }

      .mbg-popover-footer a {
        color: #FFD700;
        text-decoration: none;
      }

      .mbg-popover-footer a:hover {
        text-decoration: underline;
      }
    `

        document.head.appendChild(style)
    }

    /**
   * VIEWMODEL: Handle mutation events
   */
    private onMutation(): void {
        logger.debug('DOM mutation detected, processing MBG')
        this.processMBG()
    }

    /**
   * VIEWMODEL: Destroy the view model and clean up
   */
    destroy(): void {
        this.observer.stop()

        // Remove storage listener
        if (this.storageListener) {
            chrome.storage.onChanged.removeListener(this.storageListener)
        }

        const popover = document.querySelector('.mbg-popover')
        if (popover) {
            popover.remove()
        }

        this.initialized = false
        logger.debug('ContentViewModel destroyed')
    }

    /**
   * VIEWMODEL: Check if the view model is initialized
   */
    isInitialized(): boolean {
        return this.initialized
    }
}

/**
 * embiji.aksi.dev
 * Copyright © 2026
 */
