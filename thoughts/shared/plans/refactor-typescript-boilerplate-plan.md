# Refactoring Plan: TypeScript Chrome Extension Boilerplate
Created: 2026-03-13
Author: phoenix-agent

## Overview
**Goal:** Transform a minimal JavaScript Chrome extension into a professional TypeScript-based boilerplate with MVVM architecture, class-based design, and comprehensive testing infrastructure.
**Risk Level:** Medium
**Estimated Effort:** 2-3 days

## Current State Analysis

### Existing Structure (VERIFIED)
```
/Users/roni/work/aksi/ts-extension-chrome-boilerplate/
├── manifest.json              (v3, content_scripts only)
├── assets/
│   ├── icons/                 (16, 32, 64, 128px)
│   └── images/
│       └── logo512.png
└── src/
    └── content.js             (single file, vanilla JS)
```

### What Exists (VERIFIED)
| Component | Status | Details |
|-----------|--------|---------|
| manifest.json | ✓ Present | Manifest V3, content_scripts only |
| content.js | ✓ Present | 41 lines, vanilla JS, no types |
| Icons | ✓ Present | 4 sizes (16, 32, 64, 128) |
| Logo | ✓ Present | 512px PNG |
| package.json | ✗ Missing | No Node.js setup |
| tsconfig.json | ✗ Missing | No TypeScript config |
| Build system | ✗ Missing | No compilation |
| Tests | ✗ Missing | No test framework |
| Popup | ✗ Missing | Referenced in manifest but file doesn't exist |

### Current Code Analysis (content.js:1-41)

**Code Smells Identified:**

| Smell | Location | Severity |
|-------|----------|----------|
| No type safety | All | High |
| Global scope pollution | Lines 1-41 | Medium |
| Repeated DOM queries | Lines 2-7, 21-34 | Low |
| No error handling | All | Medium |
| Inefficient DOM traversal | Line 21 | Medium |
| No modularity | All | High |
| Direct manipulation | Lines 3, 6, 28-39 | Medium |
| Magic strings | Lines 2, 5 | Low |

**Current Functionality:**
1. Hides modals with `[data-cy-id="modal-content"]` attribute
2. Hides careers upsell with `[data-cy-id="careers-upsell"]` attribute
3. Uses MutationObserver to catch dynamically added modals
4. Aggressive paywall removal (targets large fixed/absolute elements)
5. Removes blur/backdrop filters from body elements

### Dependency Graph
```
content.js (standalone)
  |-- Uses: DOM APIs, MutationObserver
  \-- No internal dependencies
```

### Test Coverage
- Current coverage: 0%
- Tests exist: No
- Integration tests: No

## Refactoring Strategy

### Approach: Complete Reorganization with TypeScript

**Before (Current Structure):**
```javascript
// src/content.js - 41 lines of vanilla JS
function removeModal() {
  document.querySelectorAll('[data-cy-id="modal-content"]').forEach(el => {
    el.style.display = 'none';
  });
  // ...
}
removeModal();
const observer = new MutationObserver(() => {
  removeModal();
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

**After (Target MVVM Structure):**
```typescript
// src/core/ModalRemover.ts
export class ModalRemover {
  constructor(private selector: string) {}
  remove(): void { /* ... */ }
}

// src/view-models/ContentViewModel.ts
export class ContentViewModel {
  constructor(
    private modalRemover: ModalRemover,
    private paywallRemover: PaywallRemover
  ) {}
  initialize(): void { /* ... */ }
}

// src/content.ts
import { ContentViewModel } from './view-models/ContentViewModel';
const vm = new ContentViewModel(/* DI container */);
vm.initialize();
```

## Target Architecture

### Folder Structure (MVVM Pattern)
```
/Users/roni/work/aksi/ts-extension-chrome-boilerplate/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── assets/
│   └── icons/
├── src/
│   ├── core/                    # Business logic (Model layer)
│   │   ├── entities/
│   │   │   ├── ModalEntity.ts
│   │   │   └── PaywallEntity.ts
│   │   ├── services/
│   │   │   ├── ModalRemover.ts
│   │   │   ├── PaywallRemover.ts
│   │   │   └── DomObserver.ts
│   │   └── types/
│   │       └── index.ts
│   ├── view-models/            # Presentation logic (ViewModel layer)
│   │   ├── ContentViewModel.ts
│   │   └── PopupViewModel.ts
│   ├── views/                  # UI components (View layer)
│   │   ├── popup/
│   │   │   ├── popup.html
│   │   │   └── popup.ts
│   │   └── content/
│   │       └── content.ts      # Entry point
│   ├── background/             # Background scripts
│   │   └── background.ts
│   ├── shared/                 # Shared utilities
│   │   ├── utils/
│   │   │   ├── dom.ts
│   │   │   └── logger.ts
│   │   └── constants/
│   │       └── selectors.ts
│   └── types/
│       └── chrome.d.ts         # Chrome API extensions
├── dist/                       # Compiled output (gitignored)
├── __tests__/                  # Test files
│   ├── unit/
│   │   ├── core/
│   │   │   ├── ModalRemover.test.ts
│   │   │   └── PaywallRemover.test.ts
│   │   └── view-models/
│   │       └── ContentViewModel.test.ts
│   ├── integration/
│   │   └── content.test.ts
│   └── __mocks__/
│       └── chrome.mock.ts
└── scripts/
    ├── build.sh
    └── dev.sh
```

## Implementation Phases

### Phase 0: Foundation & Safety Net
**Goal:** Establish build infrastructure and baseline

**Tasks:**
- [ ] Initialize `package.json` with dependencies
- [ ] Create `tsconfig.json` with strict settings
- [ ] Set up Vite for bundling
- [ ] Configure Vitest for testing
- [ ] Create `.gitignore` for `dist/`, `node_modules/`
- [ ] Set up ESLint + Prettier
- [ ] Create baseline build script

**New Files to Create:**
```
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
.eslintrc.js
.prettierrc
.gitignore
scripts/build.sh
scripts/dev.sh
```

**Acceptance:**
- [ ] `npm run build` compiles to `dist/`
- [ ] `npm test` runs Vitest
- [ ] TypeScript compiles without errors

### Phase 1: Type System & Shared Utilities
**Goal:** Establish foundation types and utilities

**Tasks:**
- [ ] Create `src/core/types/index.ts` - Core type definitions
- [ ] Create `src/shared/utils/dom.ts` - DOM utilities
- [ ] Create `src/shared/utils/logger.ts` - Logging utility
- [ ] Create `src/shared/constants/selectors.ts` - Magic strings as constants
- [ ] Create `__tests__/__mocks__/chrome.mock.ts` - Chrome API mocks

**Files:**
```
src/core/types/index.ts
src/shared/utils/dom.ts
src/shared/utils/logger.ts
src/shared/constants/selectors.ts
__tests__/__mocks__/chrome.mock.ts
```

**Acceptance:**
- [ ] All utilities have TypeScript types
- [ ] Logger has level-based filtering
- [ ] DOM utilities are testable

### Phase 2: Model Layer (Core Business Logic)
**Goal:** Extract business logic into testable services

**Tasks:**
- [ ] Create `ModalEntity.ts` - Modal data structure
- [ ] Create `PaywallEntity.ts` - Paywall data structure
- [ ] Create `ModalRemover.ts` - Modal removal service
- [ ] Create `PaywallRemover.ts` - Paywall removal service
- [ ] Create `DomObserver.ts` - MutationObserver wrapper
- [ ] Write unit tests for all services

**Files:**
```
src/core/entities/ModalEntity.ts
src/core/entities/PaywallEntity.ts
src/core/services/ModalRemover.ts
src/core/services/PaywallRemover.ts
src/core/services/DomObserver.ts
__tests__/unit/core/ModalRemover.test.ts
__tests__/unit/core/PaywallRemover.test.ts
__tests__/unit/core/DomObserver.test.ts
```

**Acceptance:**
- [ ] Each service is independently testable
- [ ] No direct DOM manipulation in services (use utils)
- [ ] 80%+ test coverage on core layer

### Phase 3: ViewModel Layer (Presentation Logic)
**Goal:** Create ViewModels that orchestrate services

**Tasks:**
- [ ] Create `ContentViewModel.ts` - Content script orchestrator
- [ ] Create `PopupViewModel.ts` - Popup orchestrator (placeholder)
- [ ] Implement dependency injection pattern
- [ ] Write unit tests for ViewModels

**Files:**
```
src/view-models/ContentViewModel.ts
src/view-models/PopupViewModel.ts
__tests__/unit/view-models/ContentViewModel.test.ts
__tests__/unit/view-models/PopupViewModel.test.ts
```

**Acceptance:**
- [ ] ViewModels are agnostic to DOM (use services)
- [ ] Easy to test with mocked services
- [ ] Initialization lifecycle is clear

### Phase 4: View Layer (Entry Points)
**Goal:** Create clean entry points

**Tasks:**
- [ ] Create `src/views/content/content.ts` - Content script entry
- [ ] Create `src/views/popup/popup.html` - Popup UI
- [ ] Create `src/views/popup/popup.ts` - Popup logic
- [ ] Create `src/background/background.ts` - Background script placeholder
- [ ] Update `manifest.json` to reference built files

**Files:**
```
src/views/content/content.ts
src/views/popup/popup.html
src/views/popup/popup.ts
src/background/background.ts
```

**Acceptance:**
- [ ] Entry points are thin (just instantiate ViewModels)
- [ ] Manifest references `dist/` files correctly
- [ ] Extension loads without errors

### Phase 5: Integration Tests
**Goal:** End-to-end testing

**Tasks:**
- [ ] Create integration test for content script
- [ ] Test MutationObserver behavior
- [ ] Test modal removal in DOM-like environment
- [ ] Add jsdom for DOM testing

**Files:**
```
__tests__/integration/content.test.ts
```

**Acceptance:**
- [ ] Integration tests pass
- [ ] Cover main user flows

### Phase 6: Cleanup & Documentation
**Goal:** Polish and document

**Tasks:**
- [ ] Remove old `src/content.js`
- [ ] Create README.md with setup instructions
- [ ] Add CONTRIBUTING.md
- [ ] Document MVVM architecture
- [ ] Add example for adding new features
- [ ] Verify all builds pass

**Files:**
```
README.md
CONTRIBUTING.md
docs/ARCHITECTURE.md
docs/ADDING_FEATURES.md
```

**Acceptance:**
- [ ] No old JavaScript files remain
- [ ] Documentation is clear
- [ ] New developer can onboard in <30 min

## Technical Specifications

### package.json Dependencies
```json
{
  "name": "ts-extension-chrome-boilerplate",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build --mode production",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.254",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitest/ui": "^1.0.0",
    "eslint": "^8.50.0",
    "jsdom": "^23.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["chrome", "jsdom", "vitest/globals"]
  },
  "include": ["src/**/*", "__tests__/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/views/content/content.ts'),
        popup: resolve(__dirname, 'src/views/popup/popup.html'),
        background: resolve(__dirname, 'src/background/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
```

## Class-Based Architecture Examples

### ModalRemover Service
```typescript
// src/core/services/ModalRemover.ts
import { domUtils } from '../../shared/utils/dom';
import { logger } from '../../shared/utils/logger';

export class ModalRemover {
  private readonly selector: string;
  private removedCount = 0;

  constructor(selector: string) {
    this.selector = selector;
  }

  remove(): number {
    const elements = document.querySelectorAll(this.selector);
    elements.forEach(el => {
      domUtils.hideElement(el);
      this.removedCount++;
    });
    
    if (elements.length > 0) {
      logger.info(`Removed ${elements.length} modal(s)`);
    }
    
    return elements.length;
  }

  getRemovedCount(): number {
    return this.removedCount;
  }

  reset(): void {
    this.removedCount = 0;
  }
}
```

### ContentViewModel
```typescript
// src/view-models/ContentViewModel.ts
import { ModalRemover } from '../core/services/ModalRemover';
import { PaywallRemover } from '../core/services/PaywallRemover';
import { DomObserver } from '../core/services/DomObserver';

export class ContentViewModel {
  private readonly modalRemover: ModalRemover;
  private readonly paywallRemover: PaywallRemover;
  private readonly observer: DomObserver;

  constructor(
    modalSelector: string,
    paywallSelector: string
  ) {
    this.modalRemover = new ModalRemover(modalSelector);
    this.paywallRemover = new PaywallRemover();
    this.observer = new DomObserver(() => this.onMutation());
  }

  initialize(): void {
    this.runRemoval();
    this.observer.start();
  }

  private runRemoval(): void {
    this.modalRemover.remove();
    this.paywallRemover.remove();
  }

  private onMutation(): void {
    this.runRemoval();
  }

  destroy(): void {
    this.observer.stop();
  }
}
```

## MVVM Pattern Explanation

### Model (Core Layer)
- **Purpose:** Business logic and data structures
- **Contains:** Services, entities, repositories
- **Dependencies:** Only on utilities and types
- **Example:** `ModalRemover`, `PaywallRemover`

### ViewModel (Presentation Logic)
- **Purpose:** Orchestrate services, expose state to views
- **Contains:** ViewModels, state management
- **Dependencies:** Model layer, shared utilities
- **Example:** `ContentViewModel`

### View (UI Layer)
- **Purpose:** Thin entry points, minimal logic
- **Contains:** Content scripts, popup, background
- **Dependencies:** ViewModel layer
- **Example:** `content.ts` (just instantiates ViewModel)

## Backward Compatibility

### Breaking Changes
| Change | Impact | Migration Path |
|--------|--------|----------------|
| N/A - New boilerplate | N/A | N/A |

### Deprecation Strategy
Not applicable - this is a new boilerplate project.

## Risks & Mitigations
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Chrome API changes | Low | High | Use @types/chrome, test in target browser |
| Vite bundling issues | Medium | Medium | Test build output thoroughly |
| Type errors in migration | High | Low | Strict tsconfig, incremental migration |
| Test flakiness with DOM | Medium | Medium | Use jsdom, mock DOM APIs |

## Metrics
| Metric | Before | Target |
|--------|--------|--------|
| TypeScript coverage | 0% | 100% |
| Test coverage | 0% | >80% |
| Cyclomatic complexity (content.js) | ~3 | <3 per class |
| Lines per file | 41 (one file) | <200 per file |
| Number of files | 2 | 30+ |
| Build time | N/A | <5s |

## Success Criteria
1. [ ] All TypeScript compiles without errors
2. [ ] `npm run build` produces working extension
3. [ ] `npm test` passes with >80% coverage
4. [ ] Extension functions identically to original
5. [ ] New feature can be added in <15 minutes
6. [ ] Clear documentation for onboarding
7. [ ] No ESLint warnings
8. [ ] Prettier formatting consistent

## Development Workflow

### Adding a New Feature
1. Create entity in `src/core/entities/`
2. Create service in `src/core/services/`
3. Write unit tests in `__tests__/unit/core/`
4. Add to ViewModel if needed
5. Update view entry point if UI needed
6. Run `npm run build` and test in Chrome

### Running Tests
```bash
# Watch mode
npm test

# Single run
npm run test:run

# Coverage
npm run test:coverage

# UI mode
npm run test:ui
```

### Building
```bash
# Development (watch)
npm run dev

# Production
npm run build
```

## Next Steps
1. Review and approve this plan
2. Run Phase 0 (Foundation)
3. Continue through Phases 1-6
4. Final verification and documentation

