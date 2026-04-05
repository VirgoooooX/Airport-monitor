import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from './storage';

describe('StorageManager', () => {
  let manager: StorageManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    manager = new StorageManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('localStorage availability detection', () => {
    it('should detect localStorage availability', () => {
      expect(manager.isAvailable()).toBe(true);
    });

    it('should detect when localStorage is unavailable', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      const newManager = new StorageManager();
      expect(newManager.isAvailable()).toBe(false);

      setItemSpy.mockRestore();
    });
  });

  describe('setItem and getItem', () => {
    it('should store and retrieve data from localStorage', () => {
      manager.setItem('test-key', 'test-value');
      expect(manager.getItem('test-key')).toBe('test-value');
    });

    it('should return null for non-existent keys', () => {
      expect(manager.getItem('non-existent')).toBe(null);
    });

    it('should handle multiple key-value pairs', () => {
      manager.setItem('key1', 'value1');
      manager.setItem('key2', 'value2');
      manager.setItem('key3', 'value3');

      expect(manager.getItem('key1')).toBe('value1');
      expect(manager.getItem('key2')).toBe('value2');
      expect(manager.getItem('key3')).toBe('value3');
    });

    it('should overwrite existing values', () => {
      manager.setItem('key', 'value1');
      expect(manager.getItem('key')).toBe('value1');

      manager.setItem('key', 'value2');
      expect(manager.getItem('key')).toBe('value2');
    });
  });

  describe('memory storage fallback', () => {
    it('should fallback to memory storage when localStorage is unavailable', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      const newManager = new StorageManager();
      newManager.setItem('test-key', 'test-value');
      expect(newManager.getItem('test-key')).toBe('test-value');

      setItemSpy.mockRestore();
    });

    it('should fallback to memory storage on setItem error', () => {
      // First call succeeds (for availability check), subsequent calls fail
      let callCount = 0;
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        callCount++;
        if (callCount > 2) {
          throw new Error('QuotaExceededError');
        }
      });

      const newManager = new StorageManager();
      expect(newManager.isAvailable()).toBe(true);

      // This should fallback to memory storage
      newManager.setItem('key', 'value');
      expect(newManager.getItem('key')).toBe('value');

      setItemSpy.mockRestore();
    });

    it('should fallback to memory storage on getItem error', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      manager.setItem('key', 'value');
      expect(manager.getItem('key')).toBe(null);

      getItemSpy.mockRestore();
    });
  });

  describe('removeItem', () => {
    it('should remove items from localStorage', () => {
      manager.setItem('key', 'value');
      expect(manager.getItem('key')).toBe('value');

      manager.removeItem('key');
      expect(manager.getItem('key')).toBe(null);
    });

    it('should handle removing non-existent keys', () => {
      expect(() => manager.removeItem('non-existent')).not.toThrow();
    });

    it('should fallback to memory storage on removeItem error', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      const newManager = new StorageManager();
      newManager.setItem('key', 'value');
      expect(newManager.getItem('key')).toBe('value');

      newManager.removeItem('key');
      expect(newManager.getItem('key')).toBe(null);

      setItemSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all items from localStorage', () => {
      manager.setItem('key1', 'value1');
      manager.setItem('key2', 'value2');
      manager.setItem('key3', 'value3');

      manager.clear();

      expect(manager.getItem('key1')).toBe(null);
      expect(manager.getItem('key2')).toBe(null);
      expect(manager.getItem('key3')).toBe(null);
    });

    it('should fallback to memory storage on clear error', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      const newManager = new StorageManager();
      newManager.setItem('key1', 'value1');
      newManager.setItem('key2', 'value2');

      newManager.clear();

      expect(newManager.getItem('key1')).toBe(null);
      expect(newManager.getItem('key2')).toBe(null);

      setItemSpy.mockRestore();
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', async () => {
      const { storageManager } = await import('./storage');
      expect(storageManager).toBeInstanceOf(StorageManager);
    });
  });

  describe('error handling', () => {
    it('should handle QuotaExceededError gracefully', () => {
      let callCount = 0;
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        callCount++;
        if (callCount > 2) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
      });

      const newManager = new StorageManager();
      
      // Should not throw, should fallback to memory storage
      expect(() => newManager.setItem('key', 'value')).not.toThrow();
      expect(newManager.getItem('key')).toBe('value');

      setItemSpy.mockRestore();
    });

    it('should handle SecurityError gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });

      const newManager = new StorageManager();
      expect(newManager.isAvailable()).toBe(false);

      // Should not throw, should use memory storage
      expect(() => newManager.setItem('key', 'value')).not.toThrow();
      expect(newManager.getItem('key')).toBe('value');

      setItemSpy.mockRestore();
    });
  });

  describe('data persistence', () => {
    it('should persist data across StorageManager instances when localStorage is available', () => {
      const manager1 = new StorageManager();
      manager1.setItem('persistent-key', 'persistent-value');

      const manager2 = new StorageManager();
      expect(manager2.getItem('persistent-key')).toBe('persistent-value');
    });

    it('should not persist data across instances when using memory storage', () => {
      // Mock localStorage to be unavailable
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      const manager1 = new StorageManager();
      manager1.setItem('memory-key', 'memory-value');

      const manager2 = new StorageManager();
      expect(manager2.getItem('memory-key')).toBe(null);

      setItemSpy.mockRestore();
    });
  });
});
