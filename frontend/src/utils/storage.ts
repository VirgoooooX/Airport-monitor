/**
 * StorageManager - Manages persistent storage with localStorage fallback to memory storage
 * 
 * This class provides a reliable storage mechanism that:
 * - Detects if localStorage is available (some browsers block it in private mode)
 * - Falls back to in-memory storage when localStorage is unavailable
 * - Handles errors gracefully (e.g., QuotaExceededError)
 * 
 * Used by i18n config and ThemeContext for storing user preferences.
 */
export class StorageManager {
  private memoryStorage: Map<string, string> = new Map();
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
  }

  /**
   * Check if localStorage is available and functional
   * @returns true if localStorage is available, false otherwise
   */
  private checkLocalStorage(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      console.warn('localStorage is not available, falling back to memory storage');
      return false;
    }
  }

  /**
   * Check if localStorage is currently available
   * @returns true if localStorage is available, false otherwise
   */
  public isAvailable(): boolean {
    return this.isLocalStorageAvailable;
  }

  /**
   * Store a value in localStorage or memory storage
   * @param key - Storage key
   * @param value - Value to store
   */
  public setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('localStorage.setItem failed:', error);
        // Fallback to memory storage
        this.memoryStorage.set(key, value);
      }
    } else {
      this.memoryStorage.set(key, value);
    }
  }

  /**
   * Retrieve a value from localStorage or memory storage
   * @param key - Storage key
   * @returns The stored value or null if not found
   */
  public getItem(key: string): string | null {
    if (this.isLocalStorageAvailable) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage.getItem failed:', error);
        return this.memoryStorage.get(key) || null;
      }
    }
    return this.memoryStorage.get(key) || null;
  }

  /**
   * Remove a value from localStorage or memory storage
   * @param key - Storage key
   */
  public removeItem(key: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('localStorage.removeItem failed:', error);
        this.memoryStorage.delete(key);
      }
    } else {
      this.memoryStorage.delete(key);
    }
  }

  /**
   * Clear all items from localStorage or memory storage
   */
  public clear(): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.clear();
      } catch (error) {
        console.warn('localStorage.clear failed:', error);
        this.memoryStorage.clear();
      }
    } else {
      this.memoryStorage.clear();
    }
  }
}

// Export a singleton instance
export const storageManager = new StorageManager();
