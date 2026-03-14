/**
 * VIEWMODEL: Content View Model
 *
 * NOTE: Converts Indonesian Rupiah money text to MBG (Makan Bergizi Gratis) time units.
 */

import { DomObserver } from '../core/services/DomObserver';
import { MBGConverter, MBGConverterConfig } from '../core/services/MBGConverter';
import { TimeUnit } from '../common/constants';
import { logger, LogLevel } from '../shared/utils/logger';

const DEBUG_MODE = true;

const STORAGE_KEY = 'mbgSettings';

interface ExtensionSettings {
  enabled?: boolean;
  requireRpPrefix?: boolean;
}

export class ContentViewModel {
  private readonly observer: DomObserver;
  private mbgConverter: MBGConverter;
  private initialized = false;
  private convertedTextNodes = new Set<Text>();
  private escapeHandlerRegistered = false;
  private popoverShownAt = 0;

  constructor(observer?: DomObserver, mbgConverter?: MBGConverter) {
    this.observer = observer || new DomObserver(() => this.onMutation());
    // Default config, will be updated from storage
    const defaultConfig: MBGConverterConfig = { requireRpPrefix: false };
    this.mbgConverter = mbgConverter || new MBGConverter(defaultConfig);
    logger.setLevel(LogLevel.INFO);
    logger.debug('ContentViewModel created');
  }

  /**
   * VIEWMODEL: Load settings from chrome.storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const settings: ExtensionSettings = result[STORAGE_KEY] || {};

      // Update MBGConverter config if requireRpPrefix changed
      if (settings.requireRpPrefix !== undefined) {
        const currentConfig = this.mbgConverter.getConfig();
        if (currentConfig.requireRpPrefix !== settings.requireRpPrefix) {
          this.mbgConverter = new MBGConverter({ requireRpPrefix: settings.requireRpPrefix });
          logger.info('Updated requireRpPrefix:', settings.requireRpPrefix);
        }
      }
    } catch (error) {
      logger.error('Failed to load settings', { error });
    }
  }

  /**
   * VIEWMODEL: Initialize the content script
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('ContentViewModel already initialized');
      return;
    }

    console.log('[MBG DEBUG] ContentViewModel initializing...');
    logger.info('Initializing ContentViewModel');

    // Load settings from storage
    await this.loadSettings();

    this.addMBGStyles();
    this.processMBG();

    if (!this.observer.isRunning()) {
      this.observer.start();
    }

    this.initialized = true;
    logger.info('ContentViewModel initialized');
  }

  /**
   * VIEWMODEL: Process text nodes for MBG conversion
   * NOTE: Only processes text nodes with valid money patterns
   * NOTE: Skips interactive elements to avoid interfering with page functionality
   */
  private processMBG(): void {
    console.log('[MBG DEBUG] processMBG started');
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (this.convertedTextNodes.has(node as Text)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement?.closest('.mbg-marker, .mbg-inline, .mbg-popover, script, style, noscript')) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (parent?.closest('button, a, [role="button"], input, select, textarea, nav, header, footer, img, video, iframe')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent?.closest('[data-testid="button"]')) {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node.textContent || '';
          if (text.length < 3) {
            return NodeFilter.FILTER_REJECT;
          }
          const hasMoney = /(?:Rp\s*[\d\.\,]+|[\d\.\,]+\s*(juta|miliar|triliun|ribu)|juta|miliar|triliun)/i.test(text);
          if (hasMoney) {
            DEBUG_MODE && console.log('[MBG DEBUG] Found potential money text:', text);
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodesToProcess: Text[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
      if (node instanceof Text) {
        nodesToProcess.push(node);
      }
    }

    DEBUG_MODE && console.log('[MBG DEBUG] Text nodes to process:', nodesToProcess.length);

    for (const textNode of nodesToProcess) {
      this.processTextNode(textNode);
    }

    if (nodesToProcess.length > 0) {
      logger.debug(`Processed ${nodesToProcess.length} text nodes for MBG`);
    }
    console.log('[MBG DEBUG] processMBG completed');
  }

  /**
   * VIEWMODEL: Process single text node
   */
  private processTextNode(textNode: Text): void {
    const text = textNode.textContent || '';
    const matches = this.mbgConverter.findMoneyPatterns(text);

    if (matches.length === 0) {
      return;
    }

    DEBUG_MODE && console.log('[MBG DEBUG] Processing text:', text, 'matches:', matches);

    this.convertedTextNodes.add(textNode);

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of matches) {
      // Skip matches that overlap with already processed areas
      if (match.startIndex < lastIndex) {
        DEBUG_MODE && console.log('[MBG DEBUG] Skipping overlapping match:', match.originalText, 'at', match.startIndex, 'last processed:', lastIndex);
        continue;
      }

      if (match.startIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.startIndex)));
      }

      const span = document.createElement('span');
      span.className = 'mbg-marker';
      span.dataset.amount = match.amount.toString();
      span.dataset.original = match.originalText;
      span.textContent = match.originalText;
      span.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showMBGPopover(span, match.amount);
      });

      const conversion = this.mbgConverter.convertToMBG(match.amount);
      const mbgText = this.getInlineMBGText(conversion);

      const mbgSpan = document.createElement('span');
      mbgSpan.className = 'mbg-inline';
      mbgSpan.textContent = ` (${mbgText})`;

      fragment.appendChild(span);
      fragment.appendChild(mbgSpan);
      lastIndex = match.endIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
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
        : conversion.perTahun.toFixed(2);
      return `${value} ${TimeUnit.TAHUN} MBG`;
    }
    if (conversion.perBulan >= 1) {
      const value = Number.isInteger(conversion.perBulan)
        ? conversion.perBulan.toLocaleString('id-ID')
        : conversion.perBulan.toFixed(2);
      return `${value} ${TimeUnit.BULAN} MBG`;
    }
    if (conversion.perMinggu >= 1) {
      const value = Number.isInteger(conversion.perMinggu)
        ? conversion.perMinggu.toLocaleString('id-ID')
        : conversion.perMinggu.toFixed(2);
      return `${value} ${TimeUnit.MINGGU} MBG`;
    }
    if (conversion.perHari >= 1) {
      const value = Number.isInteger(conversion.perHari)
        ? conversion.perHari.toLocaleString('id-ID')
        : conversion.perHari.toFixed(2);
      return `${value} ${TimeUnit.HARI} MBG`;
    }
    if (conversion.perJam >= 1) {
      const value = Number.isInteger(conversion.perJam)
        ? conversion.perJam.toLocaleString('id-ID')
        : conversion.perJam.toFixed(2);
      return `${value} ${TimeUnit.JAM} MBG`;
    }
    if (conversion.perMenit >= 1) {
      const value = Number.isInteger(conversion.perMenit)
        ? conversion.perMenit.toLocaleString('id-ID')
        : conversion.perMenit.toFixed(2);
      return `${value} ${TimeUnit.MENIT} MBG`;
    }
    if (conversion.perDetik < 1) {
      return `${conversion.perDetik.toFixed(4)} ${TimeUnit.DETIK} MBG`;
    }
    const value = Number.isInteger(conversion.perDetik)
      ? conversion.perDetik.toLocaleString('id-ID')
      : conversion.perDetik.toFixed(2);
    return `${value} ${TimeUnit.DETIK} MBG`;
  }

  /**
   * VIEWMODEL: Show MBG popover for element
   */
  private showMBGPopover(element: HTMLElement, amount: number): void {
    const existing = document.querySelector('.mbg-popover');
    if (existing) {
      existing.remove();
    }

    this.createMBGPopover(element, amount);
  }

  /**
   * VIEWMODEL: Create and show MBG popover
   */
  private createMBGPopover(target: HTMLElement, amount: number): void {
    const conversion = this.mbgConverter.convertToMBG(amount);

    const popover = document.createElement('div');
    popover.className = 'mbg-popover';

    const header = document.createElement('div');
    header.className = 'mbg-popover-header';

    const title = document.createElement('div');
    title.className = 'mbg-popover-title';
    title.textContent = `Rp ${amount.toLocaleString('id-ID')}`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mbg-popover-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.remove();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    const subtitle = document.createElement('div');
    subtitle.className = 'mbg-popover-subtitle';
    subtitle.textContent = `= ${this.mbgConverter.formatMBG(conversion)} MBG`;

    const details = document.createElement('div');
    details.className = 'mbg-popover-details';

    const detailItems = [
      { label: 'Per Detik', value: conversion.perDetik },
      { label: 'Per Menit', value: conversion.perMenit },
      { label: 'Per Jam', value: conversion.perJam },
      { label: 'Per Hari', value: conversion.perHari },
      { label: 'Per Minggu', value: conversion.perMinggu },
      { label: 'Per Bulan', value: conversion.perBulan },
      { label: 'Per Tahun', value: conversion.perTahun },
    ];

    for (const item of detailItems) {
      const row = document.createElement('div');
      row.className = 'mbg-popover-row';

      const label = document.createElement('span');
      label.className = 'mbg-popover-label';
      label.textContent = item.label + ':';

      const value = document.createElement('span');
      value.className = 'mbg-popover-value';
      value.textContent = this.formatMBGValue(item.value, item.label);

      row.appendChild(label);
      row.appendChild(value);
      details.appendChild(row);
    }

    popover.appendChild(header);
    popover.appendChild(subtitle);
    popover.appendChild(details);

    document.body.appendChild(popover);
    this.addMBGStyles();
    this.positionMBGPopover(target, popover);

    this.popoverShownAt = Date.now();

    if (!this.escapeHandlerRegistered) {
      document.addEventListener('keydown', this.handleEscapeKey);
      this.escapeHandlerRegistered = true;
    }

    logger.debug('MBG Popover shown');
  }

  /**
   * VIEWMODEL: Format MBG value for display
   */
  private formatMBGValue(value: number, label: string): string {
    if (label === 'Per Detik' && value < 1) {
      return value.toFixed(4);
    }
    if (Number.isInteger(value)) {
      return value.toLocaleString('id-ID');
    }
    return value.toFixed(2).replace('.', ',');
  }

  /**
   * VIEWMODEL: Position MBG popover near target
   */
  private positionMBGPopover(target: HTMLElement, popover: HTMLElement): void {
    const rect = target.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left + (rect.width - popoverRect.width) / 2;

    if (left < 8) {
      left = 8;
    }
    if (left + popoverRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popoverRect.width - 8;
    }
    if (top + popoverRect.height > window.innerHeight - 8) {
      top = rect.top - popoverRect.height - 8;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  /**
   * VIEWMODEL: Handle Escape key to close popover
   */
  private handleEscapeKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      const popover = document.querySelector('.mbg-popover');
      if (popover) {
        popover.remove();
      }
    }
  };

  /**
   * VIEWMODEL: Add MBG inline and popover styles
   */
  private addMBGStyles(): void {
    if (document.getElementById('mbg-popover-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'mbg-popover-styles';
    style.textContent = `
      .mbg-marker {
        cursor: pointer;
        border-bottom: 1.5px solid #FFD700;
        transition: background 0.2s;
      }

      .mbg-marker:hover {
        background: rgba(255, 215, 0, 0.15);
      }

      .mbg-inline {
        color: #667eea;
        font-weight: bold;
        font-size: 0.9em;
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
    `;

    document.head.appendChild(style);
  }

  /**
   * VIEWMODEL: Handle mutation events
   */
  private onMutation(): void {
    logger.debug('DOM mutation detected, processing MBG');
    this.processMBG();
  }

  /**
   * VIEWMODEL: Destroy the view model and clean up
   */
  destroy(): void {
    this.observer.stop();

    const popover = document.querySelector('.mbg-popover');
    if (popover) {
      popover.remove();
    }

    this.initialized = false;
    logger.debug('ContentViewModel destroyed');
  }

  /**
   * VIEWMODEL: Check if the view model is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
