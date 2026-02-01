# Quick Start Guide

## Installation

### Via NPM
```bash
npm install ists-protocol
```

### Via CDN
```html
<script src="https://unpkg.com/ists-protocol/ists.js"></script>
```

### Manual Download
Download `ists.js` from the [releases page](https://github.com/yourusername/ists-protocol/releases).

---

## Basic Usage

### ISTS Protocol - Text Compression Demo

```javascript
// Import (if using modules)
import ISTS from 'ists-protocol';

// Create instance
const ists = new ISTS();

// Compress text
const result = ists.compressText("Your text here");
console.log(`Saved ${result.savingsPercent}%`);

// Decompress
const original = ists.decompressText(result.compressed);
```

### 2. Image Compression

```javascript
const ists = new ISTS();

// Get file from input
const file = document.querySelector('input[type="file"]').files[0];

// Compress
const result = await ists.compressImage(file);
console.log(`Compressed from ${ISTS.formatBytes(result.originalSize)} to ${ISTS.formatBytes(result.compressedSize)}`);

// Restore
const dataURL = ists.decompressImage(result.compressed, result.mime);
document.querySelector('img').src = dataURL;
```

### 3. Persistent Storage

```javascript
const ists = new ISTS();

// Load existing ledger
await ists.loadLedger();

// Compress and store
const compressed = ists.compressText("Data to save");
await ists.storage.set('myKey', compressed.compressed);

// Save ledger for next session
await ists.saveLedger();

// Later: retrieve
const stored = await ists.storage.get('myKey');
const original = ists.decompressText(stored);
```

---

## Examples

Try the interactive demos:

1. **Text Compression**: Open `examples/text-compression.html` in your browser
2. **Image Compression**: Open `examples/image-compression.html` in your browser

---

## API Overview

### Text Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `compressText(text)` | Compress text data | `{compressed, originalSize, compressedSize, savingsPercent, tokenCount}` |
| `decompressText(compressed)` | Decompress text | `string` |
| `compressImage(file, options)` | Compress image | `Promise<{compressed, mime, width, height, ...}>` |
| `decompressImage(compressed, mime)` | Restore image | `string` (Data URL) |
| `saveLedger()` | Save global ledger | `Promise<void>` |
| `loadLedger()` | Load global ledger | `Promise<void>` |
| `getStats()` | Get compression stats | `{entries, size}` |
| `clearStorage()` | Clear all data | `Promise<void>` |

### Utility Functions

```javascript
ISTS.formatBytes(bytes)              // "1.5 KB"
ISTS.calculateCompressionRatio(o, c) // 90
```

---

## Configuration

```javascript
const ists = new ISTS({
  dbName: 'MyApp_Storage',        // IndexedDB database name
  storeName: 'data',              // Object store name
  ledgerKey: 'MY_LEDGER'          // Ledger storage key
});
```

---

## Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

---

## Next Steps

- Read the [full documentation](README.md)
- Check out the [technical whitepaper](WHITEPAPER.md)
- Explore the [examples](examples/)
- [Report issues](https://github.com/yourusername/ists-protocol/issues)
