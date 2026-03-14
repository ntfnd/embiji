# Architecture Documentation

## Overview

This Chrome Extension follows the MVVM (Model-View-ViewModel) architectural pattern, providing a clean separation of concerns and making the codebase maintainable and testable.

## Architecture Layers

### Model Layer (`src/core/`)

The Model layer contains business logic and is independent of any UI concerns.

**Components:**
- **Services**: Core business logic classes
  - `ModalRemover.ts` - Handles modal removal logic
  - `PaywallRemover.ts` - Handles paywall detection and removal
  - `DomObserver.ts` - Wraps MutationObserver for DOM watching
- **Types**: TypeScript interfaces and enums
- **Entities**: Data structures (if needed)

**Principles:**
- No direct UI manipulation
- No dependencies on ViewModels or Views
- Highly testable in isolation

### ViewModel Layer (`src/view-models/`)

The ViewModel layer orchestrates services and exposes state to Views.

**Components:**
- `ContentViewModel.ts` - Coordinates content script behavior
- `PopupViewModel.ts` - Manages popup UI state

**Principles:**
- Depends on Model layer services
- Exposes simple methods for Views to call
- Maintains state for UI binding
- No direct DOM manipulation (delegates to services)

### View Layer (`src/views/`, `src/background/`)

The View layer contains thin entry points with minimal logic.

**Components:**
- `content/content.ts` - Content script entry point
- `popup/popup.html` - Popup UI markup
- `popup/popup.ts` - Popup script entry point
- `background/background.ts` - Background service worker

**Principles:**
- Minimal logic (just instantiate ViewModels)
- Delegates all work to ViewModels
- No business logic

## Data Flow

```
User Action/Event
    ↓
View (content.ts, popup.ts)
    ↓
ViewModel (ContentViewModel, PopupViewModel)
    ↓
Services (ModalRemover, PaywallRemover, etc.)
    ↓
DOM/Chrome APIs
```

## Dependency Injection

The ViewModels use constructor injection for their dependencies:

```typescript
export class ContentViewModel {
  constructor(
    private modalRemover: ModalRemover,
    private paywallRemover: PaywallRemover,
    private observer: DomObserver
  ) {}
}
```

This makes testing easier by allowing mocked services to be injected.

## Utilities (`src/shared/`)

Shared utilities that can be used across all layers:

- `utils/dom.ts` - DOM manipulation helpers
- `utils/logger.ts` - Logging utility
- `constants/selectors.ts` - CSS selector constants

## Testing Strategy

### Unit Tests
- Test each class in isolation
- Mock dependencies
- Fast execution
- Located in `__tests__/unit/`

### Integration Tests
- Test interactions between components
- Use jsdom for DOM testing
- Slower but more comprehensive
- Located in `__tests__/integration/`

## File Naming Conventions

- **Classes**: PascalCase (`ModalRemover.ts`)
- **Tests**: `[ClassName].test.ts`
- **Utilities**: camelCase (`dom.ts`, `logger.ts`)
- **Constants**: camelCase (`selectors.ts`)

## Extension Lifecycle

1. **Content Script**: Runs when page matches `content_scripts` in manifest
   - Creates `ContentViewModel`
   - Calls `initialize()`
   - Observes DOM changes

2. **Popup**: Opens when user clicks extension icon
   - Creates `PopupViewModel`
   - Displays current state
   - Handles user interactions

3. **Background**: Runs persistently as service worker
   - Listens for messages
   - Handles cross-tab communication
