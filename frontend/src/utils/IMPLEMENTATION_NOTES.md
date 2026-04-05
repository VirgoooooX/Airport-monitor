# StorageManager Implementation Notes

## Task 11.1: 创建 StorageManager 类

### Implementation Summary

Created a robust `StorageManager` class that provides reliable storage with automatic fallback to in-memory storage when localStorage is unavailable.

### Files Created

1. **frontend/src/utils/storage.ts** - Main StorageManager class implementation
2. **frontend/src/utils/storage.test.ts** - Comprehensive unit tests
3. **frontend/src/utils/index.ts** - Export file for utils
4. **frontend/src/utils/README.md** - Documentation and usage examples

### Requirements Satisfied

✅ **Requirement 1.5**: Storage_Manager 持久化用户选择的语言偏好
- Implemented `setItem()` and `getItem()` methods for storing/retrieving preferences
- Automatically persists to localStorage when available

✅ **Requirement 4.4**: 回退机制（当 localStorage 不可用时）
- Detects localStorage availability on initialization
- Falls back to in-memory storage (Map) when localStorage is blocked
- Handles errors gracefully (QuotaExceededError, SecurityError)

### Key Features

1. **localStorage Availability Detection**
   - Tests localStorage on initialization
   - Handles private browsing mode and disabled localStorage

2. **Graceful Error Handling**
   - Wraps all localStorage operations in try-catch blocks
   - Logs warnings to console without breaking the application
   - Automatically falls back to memory storage on errors

3. **Memory Storage Fallback**
   - Uses `Map<string, string>` for in-memory storage
   - Provides same API as localStorage
   - Data is lost on page reload (expected behavior)

4. **Complete API**
   - `setItem(key, value)` - Store a value
   - `getItem(key)` - Retrieve a value
   - `removeItem(key)` - Remove a value
   - `clear()` - Clear all values
   - `isAvailable()` - Check if localStorage is available

5. **Singleton Pattern**
   - Exports a singleton instance `storageManager` for convenient use
   - Also exports the class for custom instances if needed

### Testing

Created comprehensive unit tests covering:
- ✅ localStorage availability detection
- ✅ Data storage and retrieval
- ✅ Multiple key-value pairs
- ✅ Overwriting existing values
- ✅ Memory storage fallback when localStorage is unavailable
- ✅ Fallback on setItem/getItem/removeItem errors
- ✅ removeItem functionality
- ✅ clear functionality
- ✅ Singleton instance export
- ✅ QuotaExceededError handling
- ✅ SecurityError handling
- ✅ Data persistence across instances

**Note**: Tests are written using vitest but cannot be run yet as vitest is not installed in the frontend package. The test infrastructure needs to be set up in a future task.

### Usage Example

```typescript
import { storageManager } from './utils/storage';

// Store language preference
storageManager.setItem('airport-monitor-language', 'zh');

// Retrieve language preference
const language = storageManager.getItem('airport-monitor-language');

// Store theme preference
storageManager.setItem('airport-monitor-theme', 'dark');

// Check if localStorage is available
if (storageManager.isAvailable()) {
  console.log('Using localStorage');
} else {
  console.log('Using memory storage fallback');
}
```

### Integration Points

The StorageManager will be used by:
1. **i18n Configuration** (Task 11.2) - Store language preferences
2. **ThemeContext** (Already implemented) - Store theme preferences
3. Any future features requiring persistent storage

### Design Decisions

1. **Class-based approach**: Allows for encapsulation and easy testing
2. **Singleton pattern**: Convenient for most use cases while still allowing custom instances
3. **Map for memory storage**: Efficient and provides similar API to localStorage
4. **Console warnings**: Helps developers debug storage issues without breaking the app
5. **Type safety**: Full TypeScript support with proper types

### Next Steps

1. Install vitest in frontend package to enable test execution
2. Integrate StorageManager into i18n configuration (Task 11.2)
3. Update ThemeContext to use StorageManager instead of direct localStorage calls
4. Add integration tests once i18n is implemented

### Compliance

- ✅ Follows design document specifications
- ✅ Implements all required methods
- ✅ Handles all error scenarios
- ✅ Provides comprehensive tests
- ✅ Includes documentation
- ✅ No TypeScript errors
- ✅ Ready for integration with i18n and ThemeContext
