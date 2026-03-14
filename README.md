# Embiji - Money to MBG Price Converter Chrome Extension

> **DISCLAIMER**: This project is a personal experiment for educational and calculation purposes only. It is **NOT officially affiliated** with Badan Gizi Nasional (National Food and Nutrition Agency of Indonesia) or the government's Makan Bergizi Gratis (MBG) program. The conversion rate (1.2 Triliun = 1 Hari MBG) is based on publicly available information and may not reflect actual program rates. This tool does not represent any government institution or official program.

Chrome extension to convert Indonesian Rupiah money amounts to MBG (Makan Bergizi Gratis) time units.

**1.2 Triliun = 1 Hari MBG**

## Features

- **Auto-convert** Rupiah amounts to MBG time on any webpage
- **Inline display** shows quick conversion (e.g., "Rp 20.075.000 (1 Detik MBG)")
- **Click for details** - hover on any money text for full breakdown
- **Supported formats**:
  - `Rp 100.000`, `Rp.20.075.000`, `Rp175 Triliun`
  - `20 Juta`, `500 Ribu`, `1.5 Miliar`, `2 Triliun`
  - `Ribuan`, `Jutaan`, `Miliaran`, `Triliunan`
- **Case-insensitive** - works with `juta`, `Juta`, `JUTA`

## Tech Stack

- TypeScript with strict mode
- MVVM Architecture (Model-View-ViewModel)
- Vite for bundling (IIFE format for content scripts)
- Chrome Manifest V3
- Switch-case patterns (no nested if/else)

## Project Structure

```
src/
├── common/constants/       # Reusable enums
│   ├── number/            # NumberWord, NumberValue
│   ├── money/             # MoneyMultiplier
│   └── time/              # TimeUnit
├── core/
│   ├── services/          # MBGConverter, DomObserver
│   └── types/             # ObserverConfig, LogLevel, LogEntry
├── shared/utils/          # Logger utility
├── types/                 # Chrome type declarations
├── view-models/           # ContentViewModel, PopupViewModel
└── views/                 # Entry points (content, popup, background)

dist/                      # Build output (load this in Chrome)
manifest.json              # Extension manifest
package.json               # Dependencies & scripts
build.js                   # Custom build script
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone and install
git clone <repo-url>
cd ts-extension-chrome-boilerplate
npm install
```

### Available Scripts

```bash
# Build extension (outputs to dist/)
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format
```

### Development Workflow

1. Make changes to source files in `src/`
2. Run `npm run build` to compile
3. Reload extension in Chrome (see below)
4. Test changes

For faster iteration during development:
1. After `npm run build`, go to `chrome://extensions/`
2. Click refresh icon on MBG Price Converter card
3. Or use keyboard: `Ctrl+R` on extensions page

## Running Locally

### Loading the Extension in Chrome

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Open Chrome extensions page:**
   - Navigate to `chrome://extensions/`
   - Or: Chrome menu → More tools → Extensions

3. **Enable Developer mode:**
   - Toggle "Developer mode" in top right

4. **Load the extension:**
   - Click "Load unpacked"
   - Select the `dist/` folder (NOT the project root!)

5. **Verify installation:**
   - You should see "MBG Price Converter" in your extensions list
   - MBG icon should appear in Chrome toolbar

### Testing the Extension

1. **Visit any webpage** with Indonesian prices (news, e-commerce, etc.)

2. **Look for converted prices:**
   - Inline text like: `Rp 20.075.000 (1 Detik MBG)`
   - Money text is underlined - click it for popover details

3. **Try different formats:**
   - `Rp 100 juta` → shows MBG conversion
   - `500 ribu` → shows MBG conversion
   - `1.5 triliun` → shows MBG conversion

### Debugging

**Open DevTools:**
1. Go to `chrome://extensions/`
2. Find "MBG Price Converter"
3. Click "Service worker" link to open background script DevTools
4. On any page, open DevTools → Console to see content script logs

**Check logs:**
```javascript
// Content script logs show:
[MBG DEBUG] ContentViewModel initializing...
[MBG DEBUG] processMBG started
[MBG DEBUG] Found potential money text: Rp 20.075.000
```

## Adding New Features

### Adding a New Money Unit

1. Update `src/common/constants/money/multipliers.ts`:
   ```typescript
   export enum MoneyMultiplier {
     // ... existing units
     NEW_UNIT = 1_000_000_000_000,
   }
   ```

2. Update `src/core/services/MBGConverter.ts`:
   ```typescript
   private getMultiplier(text: string): number {
     switch (true) {
       // ... existing cases
       case text.includes('newunit'):
         return MoneyMultiplier.NEW_UNIT;
     }
   }
   ```

3. Build and test: `npm run build`

### Modifying MBG Rate

Edit `src/core/services/MBGConverter.ts`:
```typescript
private readonly TRILIUN_PER_HARI_MBG = 1.2;  // Change this value
private readonly TRILIUN_IN_RUPIAH = 1_200_000_000_000;
```

### Customizing Popover Styles

Edit `src/view-models/ContentViewModel.ts` → `addMBGStyles()` method.

## Build Output

The `dist/` folder contains:

| File | Purpose |
|------|---------|
| `content.js` | Content script (injected into webpages) |
| `popup.html` | Popup UI |
| `popup.js` | Popup script |
| `background.js` | Service worker |
| `manifest.json` | Extension manifest (copied from root) |
| `assets/` | Icons and images |

## MVVM Architecture

```
┌─────────────────────────────────────────────────────┐
│                      View                           │
│  (content.ts, popup.ts, background.ts)              │
│  - Thin entry points                                │
│  - Minimal logic                                    │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                   ViewModel                        │
│  (ContentViewModel, PopupViewModel)                 │
│  - Orchestrates services                            │
│  - Manages state                                    │
│  - No business logic                                │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                     Model                           │
│  (MBGConverter, DomObserver, Logger)                │
│  - Business logic                                   │
│  - Pure functions                                  │
│  - No UI concerns                                   │
└─────────────────────────────────────────────────────┘
```

## Code Style

- **Switch case** over nested if-else
- **Early returns** over nested conditions
- **Single if** over if-else chains
- **No ternary operators**
- **Enum** for reusable constants
- **TODO/NOTE/FIX** comments for code documentation

## License

MIT
