import { PopupViewModel } from '../../view-models/PopupViewModel'
import { logger } from '../../shared/utils/logger'

const statusElement = document.getElementById('status')!
const versionElement = document.getElementById('version')!
const toggleButton = document.getElementById('toggleButton')!
const rpOnlyCheckbox = document.getElementById('rpOnlyCheckbox') as HTMLInputElement

const viewModel = new PopupViewModel()

function updateUI(): void {
    const state = viewModel.getState()

    if (state.enabled) {
        statusElement.textContent = 'Enabled'
        statusElement.className = 'status enabled'
        toggleButton.textContent = 'Disable'
    }
    if (!state.enabled) {
        statusElement.textContent = 'Disabled'
        statusElement.className = 'status disabled'
        toggleButton.textContent = 'Enable'
    }

    versionElement.textContent = state.version

    rpOnlyCheckbox.checked = state.requireRpPrefix
}

async function initialize(): Promise<void> {
    await viewModel.initialize()
    updateUI()

    toggleButton.addEventListener('click', async () => {
        const newState = !viewModel.isEnabled()
        await viewModel.setEnabled(newState)
        updateUI()
    })

    rpOnlyCheckbox.addEventListener('change', async (e) => {
        const checked = (e.target as HTMLInputElement).checked
        await viewModel.setRequireRpPrefix(checked)
        logger.info('Rp only setting changed:', { checked })
    })

    logger.info('Popup initialized')
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize)
}
if (document.readyState !== 'loading') {
    initialize()
}

if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    (window as unknown as { __popupViewModel: unknown }).__popupViewModel = viewModel
}
