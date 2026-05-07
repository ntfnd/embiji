import { ContentViewModel } from '../../view-models/ContentViewModel'
import { logger } from '../../shared/utils/logger'

const viewModel = new ContentViewModel()

const initViewModel = async () => {
    try {
        await viewModel.initialize()
    } catch (error) {
        logger.error('Failed to initialize ContentViewModel', { error })
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewModel)
}
if (document.readyState !== 'loading') {
    initViewModel()
}

window.addEventListener('beforeunload', () => {
    viewModel.destroy()
})

if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    (window as unknown as { __contentViewModel: unknown }).__contentViewModel = viewModel
}

logger.info('Content script loaded')
