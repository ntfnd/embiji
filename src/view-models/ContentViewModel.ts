import { DomObserver } from '../core/services/DomObserver'
import { MBGConverter, MBGConverterConfig } from '../core/services/MBGConverter'
import { TimeUnit } from '../common/constants'
import { logger, LogLevel } from '../shared/utils/logger'

const isProduction = () => {
    try {
        return typeof __PROD__ !== 'undefined' && __PROD__ === true
    } catch {
        return false
    }
}

const DEBUG_MODE = !isProduction()

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
    private enabled = true
    private storageListener?: ((changes: { [key: string]: StorageChange }) => void)

    constructor(observer?: DomObserver, mbgConverter?: MBGConverter) {
        this.observer = observer || new DomObserver(() => this.onMutation())

        const defaultConfig: MBGConverterConfig = { requireRpPrefix: false }
        this.mbgConverter = mbgConverter || new MBGConverter(defaultConfig)
        logger.setLevel(LogLevel.INFO)
        logger.debug('ContentViewModel created')
    }


    private async loadSettings(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY)
            const settings: ExtensionSettings = (result[STORAGE_KEY] || {}) as ExtensionSettings

            if (settings.enabled !== undefined) {
                this.enabled = settings.enabled
                logger.info('Extension enabled:', { enabled: this.enabled })
            }

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

                if (newSettings?.enabled !== undefined && newSettings.enabled !== oldSettings?.enabled) {
                    this.enabled = newSettings.enabled
                    logger.info('Extension enabled state changed:', { enabled: this.enabled })

                    if (this.enabled) {
                        this.processMBG()
                    } else {
                        this.removeAllMBGElements()
                    }
                }

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


    private removeAllMBGElements(): void {
        const markers = document.querySelectorAll('.mbg-marker')
        markers.forEach(marker => {
            const parent = marker.parentNode
            if (parent) {
                const originalText = marker.querySelector('.mbg-original')?.textContent || marker.textContent || ''
                const textNode = document.createTextNode(originalText)
                parent.replaceChild(textNode, marker)
                parent.normalize()
            }
        })

        this.convertedTextNodes.clear()

        const popover = document.querySelector('.mbg-popover')
        if (popover) {
            popover.remove()
        }

        logger.debug('Removed all MBG elements')
    }


    async initialize(): Promise<void> {
        if (this.initialized) {
            logger.warn('ContentViewModel already initialized')
            return
        }

        logger.debug('[MBG DEBUG] ContentViewModel initializing...')
        logger.info('Initializing ContentViewModel')

        await this.loadSettings()

        this.setupStorageListener()

        this.addMBGStyles()

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


    private processMBG(): void {
        if (!this.enabled) {
            logger.debug('Extension is disabled, skipping MBG processing')
            return
        }
        logger.debug('[MBG DEBUG] processMBG started')
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (this.convertedTextNodes.has(node as Text)) {
                        return NodeFilter.FILTER_REJECT
                    }

                    if (node.parentElement?.closest('.mbg-marker, .mbg-inline, .mbg-popover, script, style, noscript')) {
                        return NodeFilter.FILTER_REJECT
                    }

                    if (node.parentElement?.closest('input, select, textarea')) {
                        return NodeFilter.FILTER_REJECT
                    }
                    const text = node.textContent || ''
                    if (text.length < 2) {
                        return NodeFilter.FILTER_REJECT
                    }

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
        logger.debug('[MBG DEBUG] processMBG completed')
    }


    private processTextNode(textNode: Text): void {
        const text = textNode.textContent || ''
        const matches = this.mbgConverter.findMoneyPatterns(text)

        if (matches.length === 0) {
            return
        }

        DEBUG_MODE && console.log('[MBG DEBUG] Processing text:', text, 'matches:', matches)

        this.convertedTextNodes.add(textNode)

        const parentElement = textNode.parentElement
        const isInsideClickable = !!parentElement?.closest('button, a, [role="button"], [data-testid="button"]')

        const fragment = document.createDocumentFragment()
        let lastIndex = 0

        for (const match of matches) {
            if (match.startIndex < lastIndex) {
                DEBUG_MODE && console.log('[MBG DEBUG] Skipping overlapping match:', match.originalText, 'at', match.startIndex, 'last processed:', lastIndex)
                continue
            }

            if (match.startIndex > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.startIndex)))
            }

            const wrapper = document.createElement('span')
            wrapper.className = 'mbg-marker'
            wrapper.dataset.amount = match.amount.toString()
            wrapper.dataset.original = match.originalText

            const textSpan = document.createElement('span')
            textSpan.className = 'mbg-original'
            textSpan.textContent = match.originalText

            const conversion = this.mbgConverter.convertToMBG(match.amount)
            const mbgText = this.getInlineMBGText(conversion)

            const mbgSpan = document.createElement('span')
            mbgSpan.className = 'mbg-inline'
            mbgSpan.textContent = ` (${mbgText})`

            wrapper.addEventListener('click', (e) => {
                if (isInsideClickable) {
                    this.showMBGPopover(wrapper, match.amount)
                } else {
                    e.preventDefault()
                    e.stopPropagation()
                    this.showMBGPopover(wrapper, match.amount)
                }
            })

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

    private showMBGPopover(element: HTMLElement, amount: number): void {
        const existing = document.querySelector('.mbg-popover')
        if (existing) {
            existing.remove()
        }

        this.createMBGPopover(element, amount)
    }

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

    private formatMBGValue(value: number, label: string): string {
        if (label === 'Per Detik' && value < 1) {
            return value.toFixed(4)
        }
        if (Number.isInteger(value)) {
            return value.toLocaleString('id-ID')
        }
        return value.toFixed(2).replace('.', ',')
    }

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

    private handleEscapeKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            const popover = document.querySelector('.mbg-popover')
            if (popover) {
                popover.remove()
            }
        }
    }

    private addMBGStyles(): void {
        if (document.getElementById('mbg-popover-styles')) {
            return
        }

        const style = document.createElement('style')
        style.id = 'mbg-popover-styles'
        style.textContent = `
      .mbg-marker {
        cursor: pointer;
        text-decoration-line: underline;
        text-decoration-style: dotted;
        text-decoration-color: oklch(0.74 0.14 82);
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
        transition: background 0.16s ease;
        display: inline;
      }
      .mbg-marker:hover {
        background: oklch(0.92 0.05 84 / 0.36);
      }
      .mbg-original {
        display: inline;
      }
      .mbg-inline {
        color: oklch(0.48 0.08 248);
        font-weight: bold;
        font-size: 0.9em;
        display: inline;
      }
      .mbg-popover {
        position: fixed;
        z-index: 2147483647;
        background-color: oklch(0.26 0.028 250 / 0.98);
        background-image:
          linear-gradient(145deg, oklch(0.3 0.035 250 / 0.35), transparent 62%),
          repeating-linear-gradient(45deg, transparent 0 8px, oklch(0.4 0.05 85 / 0.22) 8px 10px);
        border-radius: 12px;
        padding: 16px;
        min-width: 280px;
        max-width: 400px;
        box-shadow: 0 12px 32px oklch(0.1 0.01 250 / 0.34);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: oklch(0.93 0.012 95);
        animation: mbgFadeIn 0.2s ease-out;
        border: 1px solid oklch(0.7 0.08 82 / 0.85);
        outline: 1px dashed oklch(0.74 0.11 84 / 0.55);
        outline-offset: -6px;
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
        border: 1px solid oklch(0.78 0.07 82 / 0.5);
        color: oklch(0.93 0.01 95);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s ease;
        line-height: 1;
      }
      .mbg-popover-close:hover {
        background: oklch(0.42 0.03 250 / 0.65);
      }
      .mbg-popover-subtitle {
        font-size: 14px;
        color: oklch(0.88 0.03 84);
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px dashed oklch(0.82 0.06 84 / 0.45);
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
        color: oklch(0.86 0.01 245);
      }
      .mbg-popover-value {
        font-weight: bold;
        font-size: 14px;
        color: oklch(0.91 0.03 85);
      }
      .mbg-popover-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px dashed oklch(0.82 0.06 84 / 0.45);
        text-align: center;
        font-size: 11px;
        color: oklch(0.78 0.01 245);
      }
      .mbg-popover-footer a {
        color: oklch(0.87 0.1 82);
        text-decoration: none;
      }
      .mbg-popover-footer a:hover {
        text-decoration: underline;
      }
    `

        document.head.appendChild(style)
    }

    private onMutation(): void {
        logger.debug('DOM mutation detected, processing MBG')
        this.processMBG()
    }

    destroy(): void {
        this.observer.stop()

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

    isInitialized(): boolean {
        return this.initialized
    }
}