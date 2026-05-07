
import { logger } from '../shared/utils/logger'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    logger.info('Background received message', { message })

    switch ((message as { type: string }).type) {
        case 'GET_STATUS':
            sendResponse({ enabled: true, version: chrome.runtime.getManifest().version })
            break
        case 'TOGGLE_EXTENSION':
        // TODO: Implement toggle logic if needed
            sendResponse({ success: true })
            break
        default:
            logger.warn('Unknown message type', { type: (message as { type: string }).type })
    }

    return true
})

logger.info('Background script loaded')