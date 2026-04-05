# Utils Directory

This directory contains utility functions and classes used throughout the application.

## StorageManager

The `StorageManager` class provides a reliable storage mechanism with automatic fallback to in-memory storage when localStorage is unavailable.

### Features

- **localStorage Detection**: Automatically detects if localStorage is available
- **Graceful Fallback**: Falls back to in-memory storage when localStorage is blocked (e.g., in private browsing mode)
- **Error Handling**: Handles QuotaExceededError and other storage errors gracefully
- **Singleton Pattern**: Exports a singleton instance for convenient use

### Usage

```typescript
import { storageManager } from './utils/storage';

// Store a value
storageManager.setItem('user-preference', 'dark-mode');

// Retrieve a value
const preference = storageManager.getItem('user-preference');
console.log(preference); // 'dark-mode'

// Remove a value
storageManager.removeItem('user-preference');

// Clear all values
storageManager.clear();

// Check if localStorage is available
if (storageManager.isAvailable()) {
  console.log('localStorage is available');
} else {
  console.log('Using in-memory storage fallback');
}
```

### Use Cases

1. **i18n Configuration**: Storing user language preferences
2. **Theme Context**: Storing user theme preferences (dark/light mode)
3. **User Settings**: Storing any user preferences that should persist across sessions

### Implementation Details

- When localStorage is available, data is persisted across browser sessions
- When localStorage is unavailable, data is stored in memory and lost on page reload
- All localStorage operations are wrapped in try-catch blocks for error handling
- The class provides a consistent API regardless of the underlying storage mechanism

### Testing

The StorageManager includes comprehensive unit tests covering:
- localStorage availability detection
- Data storage and retrieval
- Memory storage fallback
- Error handling (QuotaExceededError, SecurityError)
- Data persistence across instances

To run tests (once vitest is configured):
```bash
npm test -- storage.test.ts --run
```
