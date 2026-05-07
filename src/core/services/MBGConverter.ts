import { NumberWord, NumberValue, MoneyMultiplier, TimeUnit } from '../../common/constants'

export interface MBGConverterConfig {
    requireRpPrefix?: boolean;
}

export interface MoneyMatch {
    amount: number;
    originalText: string;
    startIndex: number;
    endIndex: number;
}

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

export class MBGConverter {
    /** IDR per one MBG day: 1.2 x 10^12. Parsed word "triliun" = 10^12 IDR. */
    private readonly RUPIAH_PER_SATU_HARI_MBG = 1_200_000_000_000
    private readonly config: MBGConverterConfig

    constructor(config: MBGConverterConfig = {}) {
        this.config = {
            requireRpPrefix: false,
            ...config
        }
    }

    getConfig(): MBGConverterConfig {
        return { ...this.config }
    }

    parseMoneyText(text: string): number | null {
        const cleaned = text.toLowerCase().replace(/\s/g, '')

        const rpMatch = cleaned.match(/rp\.?([\d.,]+)/)
        if (!rpMatch) {
            return this.parseWordFormat(cleaned)
        }

        const numStr = rpMatch[1].replace(/\./g, '').replace(/,/g, '.')
        const parsed = parseFloat(numStr)

        if (isNaN(parsed)) {
            return null
        }

        return this.getMultiplier(cleaned) * parsed
    }

    private parseWordFormat(cleaned: string): number | null {
        const wordMatch = cleaned.match(/^([\d.,]+)\s*(satudua|tiga|empat|lima|enam|tujuh|delapan|sembilan|puluh|ratus|r|ribu|j|juta|m|miliar|t|triliun)$/)
        if (wordMatch) {
            return this.wordToAmount(wordMatch[1], wordMatch[2])
        }

        if (this.isNumberWord(cleaned)) {
            return this.wordToAmount(cleaned)
        }

        return null
    }

    private getMultiplier(text: string): number {
        const normalized = text.toLowerCase()
        switch (true) {
            case normalized.includes('triliun') || normalized.includes('triliunan') || /\b\d[\d.,]*\s*t\b/i.test(text):
                return MoneyMultiplier.TRILIUN
            case normalized.includes('miliar') || normalized.includes('miliaran') || /\b\d[\d.,]*\s*m\b/i.test(text):
                return MoneyMultiplier.MILIAR
            case normalized.includes('juta') || normalized.includes('jutaan') || /\b\d[\d.,]*\s*j\b/i.test(text):
                return MoneyMultiplier.JUTA
            case normalized.includes('ribu') || normalized.includes('ribuan') || /\b\d[\d.,]*\s*r\b/i.test(text):
                return MoneyMultiplier.RIBU
            default:
                return 1
        }
    }

    findMoneyPatterns(text: string): MoneyMatch[] {
        const matches: MoneyMatch[] = []

        const rpPatterns = [
            /Rp\.?\s*([\d.,]+)(?:\s*(?:j|juta|m|miliar|t|triliun))?(?:([.,;:?!])|\b)/gi,
        ]

        for (const pattern of rpPatterns) {
            let match
            while ((match = pattern.exec(text)) !== null) {
                const textToParse = match[0].replace(/[.,;:?!]$/, '')
                const amount = this.parseMoneyText(textToParse)
                if (amount !== null && amount > 0) {
                    matches.push({
                        amount,
                        originalText: match[0],
                        startIndex: match.index,
                        endIndex: match.index + match[0].length
                    })
                }
            }
        }

        if (!this.config.requireRpPrefix) {
            const wordPatterns = [
                /([\d.,]+)\s*(ribu|r|juta|j|miliar|m|triliun|t)(an)?(?:([.,;:?!])|\b)/gi,
                /(\d{1,3}(?:\.\d{3}){1,2})(?!\.\d)/gi,
            ]

            for (const pattern of wordPatterns) {
                let match
                while ((match = pattern.exec(text)) !== null) {
                    let textToParse = match[0].replace(/[.,;:?!]$/, '')

                    if (!textToParse.match(/ribu|juta|miliar|triliun/i)) {
                        textToParse = textToParse + ' ribu'
                    }

                    const amount = this.parseMoneyText(textToParse)
                    if (amount !== null && amount > 0) {
                        matches.push({
                            amount,
                            originalText: match[0],
                            startIndex: match.index,
                            endIndex: match.index + match[0].length
                        })
                    }
                }
            }
        }

        matches.sort((a, b) => {
            if (a.startIndex !== b.startIndex) {
                return a.startIndex - b.startIndex
            }
            return b.endIndex - a.endIndex
        })

        const unique: MoneyMatch[] = []
        for (const match of matches) {
            const isContained = unique.some(existing =>
                match.startIndex >= existing.startIndex && match.endIndex <= existing.endIndex
            )
            if (!isContained) {
                unique.push(match)
            }
        }

        return unique
    }

    convertToMBG(amount: number): MBGConversion {
        const hariMBG: number = amount / this.RUPIAH_PER_SATU_HARI_MBG

        return {
            amount,
            perDetik: hariMBG * 24 * 60 * 60,
            perMenit: hariMBG * 24 * 60,
            perJam: hariMBG * 24,
            perHari: hariMBG,
            perMinggu: hariMBG / 7,
            perBulan: hariMBG / 30,
            perTahun: hariMBG / 365
        }
    }

    formatMBG(conversion: MBGConversion): string {
        const parts: string[] = []

        if (conversion.perTahun >= 1) {
            parts.push(`${this.formatNumber(conversion.perTahun)} ${TimeUnit.TAHUN}`)
        }
        if (conversion.perBulan >= 1) {
            parts.push(`${this.formatNumber(conversion.perBulan)} ${TimeUnit.BULAN}`)
        }
        if (conversion.perMinggu >= 1) {
            parts.push(`${this.formatNumber(conversion.perMinggu)} ${TimeUnit.MINGGU}`)
        }
        if (conversion.perHari >= 1) {
            parts.push(`${this.formatNumber(conversion.perHari)} ${TimeUnit.HARI}`)
        }
        if (conversion.perJam >= 1) {
            parts.push(`${this.formatNumber(conversion.perJam)} ${TimeUnit.JAM}`)
        }
        if (conversion.perMenit >= 1) {
            parts.push(`${this.formatNumber(conversion.perMenit)} ${TimeUnit.MENIT}`)
        }
        if (conversion.perDetik >= 1 || parts.length === 0) {
            parts.push(`${this.formatNumber(conversion.perDetik)} ${TimeUnit.DETIK}`)
        }

        return parts.join(', ')
    }

    private formatNumber(num: number): string {
        if (Number.isInteger(num)) {
            return num.toLocaleString('id-ID')
        }
        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    private isNumberWord(text: string): boolean {
        const numberWords = Object.values(NumberWord)
        return numberWords.some((word) => text.includes(word))
    }

    private wordToAmount(numberPart: string, unitPart?: string): number {
        let num = 0

        const normalized = numberPart.toLowerCase()
        const unit = (unitPart || '').toLowerCase()
        const hasMBGUnit = unit.includes('triliun') || unit.includes('triliunan') || unit === 't' ||
                      unit.includes('miliar') || unit.includes('miliaran') || unit === 'm' ||
                      unit.includes('juta') || unit.includes('jutaan') || unit === 'j' ||
                      unit.includes('ribu') || unit.includes('ribuan') || unit === 'r'

        let parsed: number
        if (hasMBGUnit) {
            const lastCommaIndex = normalized.lastIndexOf(',')
            const lastDotIndex = normalized.lastIndexOf('.')

            if (lastCommaIndex > lastDotIndex) {
                parsed = parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'))
            } else {
                parsed = parseFloat(normalized.replace(/,/g, ''))
            }
        } else {
            parsed = parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'))
        }

        switch (normalized) {
            case NumberWord.SATU:
            case NumberWord.SE:
                num = NumberValue.SATU
                break
            case NumberWord.DUA:
                num = NumberValue.DUA
                break
            case NumberWord.TIGA:
                num = NumberValue.TIGA
                break
            case NumberWord.EMPAT:
                num = NumberValue.EMPAT
                break
            case NumberWord.LIMA:
                num = NumberValue.LIMA
                break
            case NumberWord.ENAM:
                num = NumberValue.ENAM
                break
            case NumberWord.TUJUH:
                num = NumberValue.TUJUH
                break
            case NumberWord.DELAPAN:
                num = NumberValue.DELAPAN
                break
            case NumberWord.SEMBILAN:
                num = NumberValue.SEMBILAN
                break
            case NumberWord.SEPULUH:
                num = NumberValue.SEPULUH
                break
            case NumberWord.SEBELAS:
                num = NumberValue.SEBELAS
                break
            case NumberWord.SERATUS:
                num = NumberValue.SERATUS
                break
            case NumberWord.SERIBU:
                num = NumberValue.SERIBU
                break
            case NumberWord.SEJUTA:
            case NumberWord.SEMBILIAR:
            case NumberWord.SETRILIUN:
                num = NumberValue.SATU
                break
            default:
                if (!isNaN(parsed)) {
                    num = parsed
                }
                break
        }

        switch (true) {
            case unit.includes('ribu') || unit.includes('ribuan') || unit.includes('rb') || unit === 'r':
                return num * MoneyMultiplier.RIBU
            case unit.includes('juta') || unit.includes('jutaan') || unit === 'j':
                return num * MoneyMultiplier.JUTA
            case unit.includes('miliar') || unit.includes('miliaran') || unit === 'm':
                return num * MoneyMultiplier.MILIAR
            case unit.includes('triliun') || unit.includes('triliunan') || unit === 't':
                return num * MoneyMultiplier.TRILIUN
            default:
                return num
        }
    }
}

export const mbgConverter = new MBGConverter({ requireRpPrefix: false })