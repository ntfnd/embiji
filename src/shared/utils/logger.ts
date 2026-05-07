import type { LogEntry } from '../../core/types'
import { LogLevel } from '../../core/types'


const isProduction = () => {
    try {
        return typeof __PROD__ !== 'undefined' && __PROD__ === true
    } catch {
        return false
    }
}


export { LogLevel }


interface ILogger {
    debug(message: string, context?: Record<string, unknown>): void
    info(message: string, context?: Record<string, unknown>): void
    warn(message: string, context?: Record<string, unknown>): void
    error(message: string, context?: Record<string, unknown>): void
    setLevel(level: LogLevel): void
    getLevel(): LogLevel
    getHistory(): LogEntry[]
    clear(): void
    createScoped(scope: string): ILogger
}

class Logger implements ILogger {
    private currentLevel: LogLevel = 1 as LogLevel
    private history: LogEntry[] = []
    private maxHistorySize = 1000
    private scope: string | null = null
    private isProd = isProduction()

    constructor(scope?: string) {
        if (scope) {
            this.scope = scope
        }
    }


    debug(message: string, context?: Record<string, unknown>): void {
        if (!this.isProd) {
            this.log(LogLevel.DEBUG, message, context)
        }
    }


    info(message: string, context?: Record<string, unknown>): void {
        if (!this.isProd) {
            this.log(LogLevel.INFO, message, context)
        }
    }


    warn(message: string, context?: Record<string, unknown>): void {
        if (!this.isProd) {
            this.log(LogLevel.WARN, message, context)
        }
    }


    error(message: string, context?: Record<string, unknown>): void {
        if (!this.isProd) {
            this.log(LogLevel.ERROR, message, context)
        }
    }


    setLevel(level: LogLevel): void {
        this.currentLevel = level
    }


    getLevel(): LogLevel {
        return this.currentLevel
    }


    getHistory(): LogEntry[] {
        return [...this.history]
    }


    clear(): void {
        this.history = []
    }


    createScoped(scope: string): ILogger {
        const scopedLogger = new Logger(scope)
        scopedLogger.setLevel(this.currentLevel)
        return scopedLogger
    }


    private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
        if (level < this.currentLevel) {
            return
        }

        const entry: LogEntry = { level, message, timestamp: Date.now(), context }

        this.history.push(entry)
        if (this.history.length > this.maxHistorySize) {
            this.history.shift()
        }

        this.outputToConsole(entry)
    }


    private outputToConsole(entry: LogEntry): void {
        const levelName = LogLevel[entry.level]
        const timestamp = new Date(entry.timestamp).toISOString()
        const scopePrefix = this.scope ? `[${this.scope}] ` : ''
        const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ''

        const message = `${timestamp} [${levelName}] ${scopePrefix}${entry.message}${contextStr}`

        if (entry.level === LogLevel.DEBUG) {
            console.log(message)
        }
        if (entry.level === LogLevel.INFO) {
            console.info(message)
        }
        if (entry.level === LogLevel.WARN) {
            console.warn(message)
        }
        if (entry.level === LogLevel.ERROR) {
            console.error(message)
        }
    }
}


export const logger = new Logger()


export function createLogger(scope: string): ILogger {
    return logger.createScoped(scope)
}
