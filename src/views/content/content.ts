/**
 * VIEW: Content Script Entry Point
 *
 * NOTE: This is the main entry point for the content script.
 * It creates and initializes the ContentViewModel.
 */

import { ContentViewModel } from '../../view-models/ContentViewModel';
import { logger } from '../../shared/utils/logger';

// NOTE: Create and initialize the content view model
const viewModel = new ContentViewModel();

// NOTE: Initialize when DOM is ready (now async)
const initViewModel = async () => {
  try {
    await viewModel.initialize();
  } catch (error) {
    logger.error('Failed to initialize ContentViewModel', { error });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initViewModel);
}
if (document.readyState !== 'loading') {
  initViewModel();
}

// NOTE: Clean up on page unload
window.addEventListener('beforeunload', () => {
  viewModel.destroy();
});

// NOTE: Export for debugging (will be stripped in production)
if ((import.meta as any).env?.DEV) {
  (window as any).__contentViewModel = viewModel;
}

logger.info('Content script loaded');
