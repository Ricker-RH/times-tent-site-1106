export type TimedSiteConfigCacheHit<T> = {
  hit: true;
  value: T | null;
};

export type TimedSiteConfigCacheMiss = {
  hit: false;
};

type TimedSiteConfigCacheEntry = {
  value: unknown | null;
  expiresAt: number;
};

export class TimedSiteConfigCache {
  private readonly entries = new Map<string, TimedSiteConfigCacheEntry>();

  constructor(private readonly ttlMs: number) {}

  get<T>(key: string, now = Date.now()): TimedSiteConfigCacheHit<T> | TimedSiteConfigCacheMiss {
    const entry = this.entries.get(key);
    if (!entry) {
      return { hit: false };
    }
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return { hit: false };
    }
    return { hit: true, value: entry.value as T | null };
  }

  set(key: string, value: unknown | null, now = Date.now()): void {
    this.entries.set(key, {
      value,
      expiresAt: now + this.ttlMs,
    });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
