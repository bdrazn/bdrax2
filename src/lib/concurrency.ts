import { useEffect, useRef } from 'react';

/**
 * Mutex implementation for exclusive resource access
 */
export class Mutex {
  private locked: boolean = false;
  private waitQueue: Array<(value: boolean) => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const nextResolve = this.waitQueue.shift();
      if (nextResolve) {
        nextResolve(true);
      }
    } else {
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }
}

/**
 * Semaphore implementation for limited resource access
 */
export class Semaphore {
  private permits: number;
  private waitQueue: Array<(value: boolean) => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const nextResolve = this.waitQueue.shift();
      if (nextResolve) {
        nextResolve(true);
      }
    } else {
      this.permits++;
    }
  }

  availablePermits(): number {
    return this.permits;
  }
}

/**
 * Global mutex instances for different resources
 */
export const mutexes = {
  workspace: new Mutex(),
  messages: new Mutex(),
  analytics: new Mutex(),
  templates: new Mutex(),
  contacts: new Mutex(),
  properties: new Mutex()
};

/**
 * Global semaphores for rate-limited operations
 */
export const semaphores = {
  api: new Semaphore(10), // Limit concurrent API calls
  db: new Semaphore(5),   // Limit concurrent DB operations
  sms: new Semaphore(3)   // Limit concurrent SMS operations
};

/**
 * Hook to automatically handle mutex lifecycle
 */
export function useMutex(mutexKey: keyof typeof mutexes) {
  const mutex = mutexes[mutexKey];
  const acquired = useRef(false);

  useEffect(() => {
    let mounted = true;

    const acquireMutex = async () => {
      await mutex.acquire();
      if (mounted) {
        acquired.current = true;
      } else {
        mutex.release();
      }
    };

    acquireMutex();

    return () => {
      mounted = false;
      if (acquired.current) {
        mutex.release();
        acquired.current = false;
      }
    };
  }, [mutex]);

  return acquired.current;
}

/**
 * Hook to automatically handle semaphore lifecycle
 */
export function useSemaphore(semaphoreKey: keyof typeof semaphores) {
  const semaphore = semaphores[semaphoreKey];
  const acquired = useRef(false);

  useEffect(() => {
    let mounted = true;

    const acquireSemaphore = async () => {
      await semaphore.acquire();
      if (mounted) {
        acquired.current = true;
      } else {
        semaphore.release();
      }
    };

    acquireSemaphore();

    return () => {
      mounted = false;
      if (acquired.current) {
        semaphore.release();
        acquired.current = false;
      }
    };
  }, [semaphore]);

  return acquired.current;
}

/**
 * Utility function to execute code with mutex protection
 */
export async function withMutex<T>(
  mutexKey: keyof typeof mutexes,
  fn: () => Promise<T>
): Promise<T> {
  const mutex = mutexes[mutexKey];
  await mutex.acquire();
  try {
    return await fn();
  } finally {
    mutex.release();
  }
}

/**
 * Utility function to execute code with semaphore protection
 */
export async function withSemaphore<T>(
  semaphoreKey: keyof typeof semaphores,
  fn: () => Promise<T>
): Promise<T> {
  const semaphore = semaphores[semaphoreKey];
  await semaphore.acquire();
  try {
    return await fn();
  } finally {
    semaphore.release();
  }
}