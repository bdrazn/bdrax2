import { Mutex } from './concurrency';

/**
 * DataChangeMutex extends Mutex to add data comparison functionality
 */
export class DataChangeMutex<T> extends Mutex {
  private lastData: T | null = null;

  /**
   * Checks if data has changed and acquires lock if it has
   * @param newData The new data to compare
   * @param compareFunction Optional custom comparison function
   * @returns boolean indicating if the process should continue
   */
  async acquireIfChanged(
    newData: T,
    compareFunction: (a: T | null, b: T) => boolean = defaultCompare
  ): Promise<boolean> {
    // If no previous data exists, always proceed
    if (this.lastData === null) {
      await this.acquire();
      this.lastData = newData;
      return true;
    }

    // Check if data has changed using comparison function
    const hasChanged = !compareFunction(this.lastData, newData);
    
    if (hasChanged) {
      await this.acquire();
      this.lastData = newData;
      return true;
    }

    return false;
  }

  /**
   * Releases the mutex and optionally clears the last data
   * @param clearData Whether to clear the stored last data
   */
  releaseWithData(clearData: boolean = false): void {
    if (clearData) {
      this.lastData = null;
    }
    this.release();
  }

  /**
   * Gets the last processed data
   */
  getLastData(): T | null {
    return this.lastData;
  }
}

/**
 * Default comparison function for simple equality
 */
function defaultCompare<T>(a: T | null, b: T): boolean {
  if (a === null) return false;
  
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object' && a !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return a === b;
}

/**
 * Global data change mutex instances
 */
export const dataChangeMutexes = {
  workspace: new DataChangeMutex<any>(),
  messages: new DataChangeMutex<any>(),
  analytics: new DataChangeMutex<any>(),
  templates: new DataChangeMutex<any>(),
  contacts: new DataChangeMutex<any>(),
  properties: new DataChangeMutex<any>()
};

/**
 * Utility function to execute code only if data has changed
 */
export async function withDataChangeMutex<T, R>(
  mutexKey: keyof typeof dataChangeMutexes,
  data: T,
  fn: () => Promise<R>,
  compareFunction?: (a: T | null, b: T) => boolean
): Promise<R | null> {
  const mutex = dataChangeMutexes[mutexKey];
  
  const shouldProceed = await mutex.acquireIfChanged(data, compareFunction);
  
  if (!shouldProceed) {
    return null;
  }

  try {
    return await fn();
  } finally {
    mutex.releaseWithData();
  }
}