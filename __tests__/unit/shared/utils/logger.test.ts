/**
 * Tests for Logger Utility
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, LogLevel } from '../../../../src/shared/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    // Reset logger state before each test
    logger.setLevel(LogLevel.DEBUG);
    logger.clear();
    // Spy on console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('setLevel', () => {
    it('should set the log level', () => {
      logger.setLevel(LogLevel.WARN);
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('getLevel', () => {
    it('should return the current log level', () => {
      logger.setLevel(LogLevel.ERROR);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('debug', () => {
    it('should log debug messages when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('test message');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });

    it('should not log debug messages when level is higher', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('test message');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info messages when level is INFO or lower', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test message');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });

    it('should not log info messages when level is higher', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('test message');
      expect(console.info).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warn messages when level is WARN or lower', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('test message');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });

    it('should not log warn messages when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warn('test message');
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages when level is ERROR or lower', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('test message');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });

    it('should not log error messages when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.error('test message');
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('with context', () => {
    it('should include context in log message', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test message', { key: 'value' });
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('key'));
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('value'));
    });
  });

  describe('getHistory', () => {
    it('should return log history', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('message 1');
      logger.warn('message 2');
      const history = logger.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('message 1');
      expect(history[1].message).toBe('message 2');
    });

    it('should respect log level in history', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('ignored');
      logger.warn('logged');
      const history = logger.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('logged');
    });
  });

  describe('clear', () => {
    it('should clear log history', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('message');
      expect(logger.getHistory()).toHaveLength(1);
      logger.clear();
      expect(logger.getHistory()).toHaveLength(0);
    });
  });

  describe('createScoped', () => {
    it('should create a scoped logger with prefix', () => {
      logger.setLevel(LogLevel.INFO);
      const scopedLogger = logger.createScoped('TestScope');
      scopedLogger.info('test message');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[TestScope]'));
    });
  });
});
