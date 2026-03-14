/**
 * VIEW: Popup Script
 *
 * NOTE: This is the entry point for the extension popup UI.
 * It creates and initializes the PopupViewModel.
 */

import { PopupViewModel } from '../../view-models/PopupViewModel';
import { logger } from '../../shared/utils/logger';

// NOTE: DOM elements
const statusElement = document.getElementById('status')!;
const versionElement = document.getElementById('version')!;
const toggleButton = document.getElementById('toggleButton')!;
const rpOnlyCheckbox = document.getElementById('rpOnlyCheckbox') as HTMLInputElement;

// NOTE: Create view model
const viewModel = new PopupViewModel();

/**
 * VIEW: Update the UI based on current state
 */
function updateUI(): void {
  const state = viewModel.getState();

  // NOTE: Update status - single if for each condition
  if (state.enabled) {
    statusElement.textContent = 'Enabled';
    statusElement.className = 'status enabled';
    toggleButton.textContent = 'Disable';
  }
  if (!state.enabled) {
    statusElement.textContent = 'Disabled';
    statusElement.className = 'status disabled';
    toggleButton.textContent = 'Enable';
  }

  // NOTE: Update version
  versionElement.textContent = state.version;

  // NOTE: Update Rp only checkbox
  rpOnlyCheckbox.checked = state.requireRpPrefix;
}

/**
 * VIEW: Initialize the popup
 */
async function initialize(): Promise<void> {
  await viewModel.initialize();
  updateUI();

  // NOTE: Set up event listeners
  toggleButton.addEventListener('click', async () => {
    const newState = !viewModel.isEnabled();
    await viewModel.setEnabled(newState);
    updateUI();
  });

  rpOnlyCheckbox.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    await viewModel.setRequireRpPrefix(checked);
    logger.info('Rp only setting changed:', checked);
  });

  logger.info('Popup initialized');
}

// NOTE: Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
}
if (document.readyState !== 'loading') {
  initialize();
}

// NOTE: Export for debugging
if ((import.meta as any).env?.DEV) {
  (window as any).__popupViewModel = viewModel;
}
