/**
 * Core Type Definitions
 *
 * This file contains all core type definitions used throughout the application.
 */

/**
 * Configuration for MutationObserver
 */
export interface ObserverConfig {
    /** Observe direct children */
    childList?: boolean;
    /** Observe all descendants */
    subtree?: boolean;
    /** Observe attribute changes */
    attributes?: boolean;
    /** Observe character data changes */
    characterData?: boolean;
    /** Specific attributes to observe */
    attributeFilter?: string[];
}

/**
 * Log level for logger utility
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * Log entry structure
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: number;
    context?: Record<string, unknown>;
}
