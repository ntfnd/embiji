/**
 * BACKGROUND: Background Script
 *
 * NOTE: This is the background service worker for the extension.
 * It runs persistently and can handle events, messages, and long-running tasks.
 */

import { logger } from '../shared/utils/logger';

// NOTE: Set up message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  logger.info('Background received message', { message });

  // NOTE: Handle different message types
  switch (message.type) {
    case 'GET_STATUS':
      sendResponse({ enabled: true, version: chrome.runtime.getManifest().version });
      break;
    case 'TOGGLE_EXTENSION':
      // TODO: Implement toggle logic if needed
      sendResponse({ success: true });
      break;
    default:
      logger.warn('Unknown message type', { type: message.type });
  }

  // NOTE: Return true to indicate async response (if needed)
  return true;
});

// NOTE: Log when the background script is loaded
logger.info('Background script loaded');

// IMPORTANT: Keep the service worker alive (for Manifest V3)
// NOTE: In MV3, service workers can be terminated after 30 seconds of inactivity
// NOTE: This is expected behavior and the worker will restart when needed
