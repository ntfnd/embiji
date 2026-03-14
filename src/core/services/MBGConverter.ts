/**
 * MODEL: MBG Converter Service
 *
 * NOTE: Converts money amounts to MBG (Makan Bergizi Gratis) time units.
 * NOTE: 1.2 Triliun = 1 Hari MBG.
 */

import { logger } from '../../shared/utils/logger';
import { NumberWord, NumberValue, MoneyMultiplier, TimeUnit } from '../../common/constants';

/**
 * MBG Converter configuration
 */
export interface MBGConverterConfig {
  /** Only detect money with "Rp" prefix (Rp, RP, rp with/without dots and spaces) */
  requireRpPrefix?: boolean;
}

/**
 * Money amount with metadata
 */
export interface MoneyMatch {
  amount: number;
  originalText: string;
  startIndex: number;
  endIndex: number;
}

/**
 * MBG conversion result
 */
export interface MBGConversion {
  amount: number;
  perDetik: number;
  perMenit: number;
  perJam: number;
  perHari: number;
  perMinggu: number;
  perBulan: number;
  perTahun: number;
}

/**
 * MODEL: MBG Converter Service
 * Converts Indonesian money formats to MBG time units
 */
export class MBGConverter {
  // NOTE: 1.2 Triliun = 1 Hari MBG
  private readonly TRILIUN_PER_HARI_MBG = 1.2;
  private readonly TRILIUN_IN_RUPIAH = 1_200_000_000_000;
  private readonly config: MBGConverterConfig;

  constructor(config: MBGConverterConfig = {}) {
    this.config = {
      requireRpPrefix: false,
      ...config
    };
  }

  /**
   * MODEL: Get current config
   */
  getConfig(): MBGConverterConfig {
    return { ...this.config };
  }

  /**
   * MODEL: Parse Indonesian money text to amount
   */
  parseMoneyText(text: string): number | null {
    const cleaned = text.toLowerCase().replace(/\s/g, '');

    const rpMatch = cleaned.match(/rp\.?([\d\.\,]+)/);
    if (!rpMatch) {
      return this.parseWordFormat(cleaned);
    }

    const numStr = rpMatch[1].replace(/\./g, '').replace(/,/g, '.');
    const parsed = parseFloat(numStr);

    if (isNaN(parsed)) {
      return null;
    }

    return this.getMultiplier(cleaned) * parsed;
  }

  /**
   * MODEL: Parse word format (juta, miliar, triliun, etc.) with abbreviations (j, m, t)
   */
  private parseWordFormat(cleaned: string): number | null {
    const wordMatch = cleaned.match(/^([\d\,\.]+)\s*(satudua|tiga|empat|lima|enam|tujuh|delapan|sembilan|puluh|ratus|r|ribu|j|juta|m|miliar|t|triliun)$/);
    if (wordMatch) {
      return this.wordToAmount(wordMatch[1], wordMatch[2]);
    }

    if (this.isNumberWord(cleaned)) {
      return this.wordToAmount(cleaned);
    }

    return null;
  }

  /**
   * MODEL: Get multiplier based on unit in text (supports abbreviations: t, m, j, r)
   */
  private getMultiplier(text: string): number {
    const normalized = text.toLowerCase();
    switch (true) {
      case normalized.includes('triliun') || normalized.includes('triliunan') || /\b\d[\d\,\.]*\s*t\b/i.test(text):
        return MoneyMultiplier.TRILIUN;
      case normalized.includes('miliar') || normalized.includes('miliaran') || /\b\d[\d\,\.]*\s*m\b/i.test(text):
        return MoneyMultiplier.MILIAR;
      case normalized.includes('juta') || normalized.includes('jutaan') || /\b\d[\d\,\.]*\s*j\b/i.test(text):
        return MoneyMultiplier.JUTA;
      case normalized.includes('ribu') || normalized.includes('ribuan') || /\b\d[\d\,\.]*\s*r\b/i.test(text):
        return MoneyMultiplier.RIBU;
      default:
        return 1;
    }
  }

  /**
   * MODEL: Find all money patterns in text
   */
  findMoneyPatterns(text: string): MoneyMatch[] {
    const matches: MoneyMatch[] = [];

    // Pattern 1: Rp format with dots/commas as thousand separators, with optional word unit
    // Rp 1.000.000.000, Rp 20,075,000, Rp. 20.075.000, Rp.500.000, Rp175 Triliun, etc.
    const rpPatterns = [
      // Match Rp + number + optional word unit (j|juta|m|miliar|t|triliun)
      /Rp\.?\s*([\d\.\,]+)(?:\s*(?:j|juta|m|miliar|t|triliun))?\b/gi,
    ];

    for (const pattern of rpPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = this.parseMoneyText(match[0]);
        if (amount !== null && amount > 0) {
          matches.push({
            amount,
            originalText: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }
    }

    // Pattern 2: Word format (ribu, juta, miliar, triliun) with abbreviations (r, j, m, t)
    // Only process if requireRpPrefix is false
    if (!this.config.requireRpPrefix) {
      // Important: longer matches must come first in alternation (juta before j)
      // Word boundary \b prevents matching "t" from words like "tengah"
      const wordPatterns = [
        /([\d\,\.]+)\s*(ribu|r|juta|j|miliar|m|triliun|t)(an)?\b/gi,
      ];

      for (const pattern of wordPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const amount = this.parseMoneyText(match[0]);
          if (amount !== null && amount > 0) {
            matches.push({
              amount,
              originalText: match[0],
              startIndex: match.index,
              endIndex: match.index + match[0].length
            });
          }
        }
      }
    }

    // Remove duplicates and sort by position
    const unique = Array.from(
      new Map(matches.map(m => [`${m.startIndex}-${m.endIndex}`, m])).values()
    );
    unique.sort((a, b) => a.startIndex - b.startIndex);

    return unique;
  }

  /**
   * MODEL: Convert amount to MBG time units
   */
  convertToMBG(amount: number): MBGConversion {
    const triliun = amount / this.TRILIUN_IN_RUPIAH;
    const hariMBG = triliun / this.TRILIUN_PER_HARI_MBG;

    return {
      amount,
      perDetik: hariMBG * 24 * 60 * 60,
      perMenit: hariMBG * 24 * 60,
      perJam: hariMBG * 24,
      perHari: hariMBG,
      perMinggu: hariMBG / 7,
      perBulan: hariMBG / 30,
      perTahun: hariMBG / 365
    };
  }

  /**
   * MODEL: Format MBG conversion for display
   */
  formatMBG(conversion: MBGConversion): string {
    const parts: string[] = [];

    if (conversion.perTahun >= 1) {
      parts.push(`${this.formatNumber(conversion.perTahun)} ${TimeUnit.TAHUN}`);
    }
    if (conversion.perBulan >= 1) {
      parts.push(`${this.formatNumber(conversion.perBulan)} ${TimeUnit.BULAN}`);
    }
    if (conversion.perMinggu >= 1) {
      parts.push(`${this.formatNumber(conversion.perMinggu)} ${TimeUnit.MINGGU}`);
    }
    if (conversion.perHari >= 1) {
      parts.push(`${this.formatNumber(conversion.perHari)} ${TimeUnit.HARI}`);
    }
    if (conversion.perJam >= 1) {
      parts.push(`${this.formatNumber(conversion.perJam)} ${TimeUnit.JAM}`);
    }
    if (conversion.perMenit >= 1) {
      parts.push(`${this.formatNumber(conversion.perMenit)} ${TimeUnit.MENIT}`);
    }
    if (conversion.perDetik >= 1 || parts.length === 0) {
      parts.push(`${this.formatNumber(conversion.perDetik)} ${TimeUnit.DETIK}`);
    }

    return parts.join(', ');
  }

  /**
   * MODEL: Format number with Indonesian locale
   */
  private formatNumber(num: number): string {
    if (Number.isInteger(num)) {
      return num.toLocaleString('id-ID');
    }
    return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * MODEL: Check if text is a number word
   */
  private isNumberWord(text: string): boolean {
    const numberWords = Object.values(NumberWord);
    return numberWords.some((word) => text.includes(word));
  }

  /**
   * MODEL: Convert word/number combination to amount
   * NOTE: Detects Indonesian vs English format automatically
   * NOTE: Indonesian: "1,2 juta" (comma=decimal), "1.200 juta" (dot=thousand)
   * NOTE: English: "1.2 juta" (dot=decimal), "1,200 juta" (comma=thousand)
   * NOTE: For Rupiah only, Indonesian format is standard: dot=thousand, comma=decimal
   */
  private wordToAmount(numberPart: string, unitPart?: string): number {
    let num = 0;

    const normalized = numberPart.toLowerCase();
    const unit = (unitPart || '').toLowerCase();
    const hasMBGUnit = unit.includes('triliun') || unit.includes('triliunan') || unit === 't' ||
                      unit.includes('miliar') || unit.includes('miliaran') || unit === 'm' ||
                      unit.includes('juta') || unit.includes('jutaan') || unit === 'j' ||
                      unit.includes('ribu') || unit.includes('ribuan') || unit === 'r';

    let parsed: number;
    if (hasMBGUnit) {
      // For MBG units, detect format:
      // - If comma is last separator: Indonesian format (comma=decimal, dot=thousand)
      // - If dot is last separator: English format (dot=decimal, comma=thousand)
      const lastCommaIndex = normalized.lastIndexOf(',');
      const lastDotIndex = normalized.lastIndexOf('.');

      if (lastCommaIndex > lastDotIndex) {
        // Indonesian format: "1,2" or "1.200,5"
        // Remove dots (thousand), replace comma with dot (decimal)
        parsed = parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'));
      } else {
        // English format: "1.2" or "1,200.5"
        // Remove commas (thousand), keep dots as decimal
        parsed = parseFloat(normalized.replace(/,/g, ''));
      }
    } else {
      // For Rupiah only: Indonesian format standard
      // dot = thousand separator, comma = decimal
      parsed = parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'));
    }

    switch (normalized) {
      case NumberWord.SATU:
      case NumberWord.SE:
        num = NumberValue.SATU;
        break;
      case NumberWord.DUA:
        num = NumberValue.DUA;
        break;
      case NumberWord.TIGA:
        num = NumberValue.TIGA;
        break;
      case NumberWord.EMPAT:
        num = NumberValue.EMPAT;
        break;
      case NumberWord.LIMA:
        num = NumberValue.LIMA;
        break;
      case NumberWord.ENAM:
        num = NumberValue.ENAM;
        break;
      case NumberWord.TUJUH:
        num = NumberValue.TUJUH;
        break;
      case NumberWord.DELAPAN:
        num = NumberValue.DELAPAN;
        break;
      case NumberWord.SEMBILAN:
        num = NumberValue.SEMBILAN;
        break;
      case NumberWord.SEPULUH:
        num = NumberValue.SEPULUH;
        break;
      case NumberWord.SEBELAS:
        num = NumberValue.SEBELAS;
        break;
      case NumberWord.SERATUS:
        num = NumberValue.SERATUS;
        break;
      case NumberWord.SERIBU:
        num = NumberValue.SERIBU;
        break;
      case NumberWord.SEJUTA:
      case NumberWord.SEMBILIAR:
      case NumberWord.SETRILIUN:
        num = NumberValue.SATU;
        break;
      default:
        if (!isNaN(parsed)) {
          num = parsed;
        }
        break;
    }

    switch (true) {
      case unit.includes('ribu') || unit.includes('ribuan') || unit.includes('rb') || unit === 'r':
        return num * MoneyMultiplier.RIBU;
      case unit.includes('juta') || unit.includes('jutaan') || unit === 'j':
        return num * MoneyMultiplier.JUTA;
      case unit.includes('miliar') || unit.includes('miliaran') || unit === 'm':
        return num * MoneyMultiplier.MILIAR;
      case unit.includes('triliun') || unit.includes('triliunan') || unit === 't':
        return num * MoneyMultiplier.TRILIUN;
      default:
        return num;
    }
  }
}

/**
 * MODEL: Export singleton instance with default config
 */
export const mbgConverter = new MBGConverter({ requireRpPrefix: false });
