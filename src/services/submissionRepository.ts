import { CleanupSubmissionRecord } from '../types/cleanupVerification';

const STORAGE_SUBMISSIONS_KEY = 'ecoqala_cleanup_submissions';

class SubmissionRepository {
  private inMemory: Map<string, CleanupSubmissionRecord> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> submissionId
  private rewardedHashes: Set<string> = new Set(); // sha256 -> approved

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (raw) {
        const parsed: CleanupSubmissionRecord[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            this.inMemory.set(item.id, item);
            if (item.idempotencyKey) {
              this.idempotencyIndex.set(item.idempotencyKey, item.id);
            }
            if (item.status === 'approved') {
              if (item.beforeHash) this.rewardedHashes.add(item.beforeHash);
              if (item.afterHash) this.rewardedHashes.add(item.afterHash);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not read submissions from localStorage:', e);
    }
  }

  private persist() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const all = Array.from(this.inMemory.values());
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Could not save submissions to localStorage:', e);
    }
  }

  public save(record: CleanupSubmissionRecord): void {
    this.inMemory.set(record.id, record);
    if (record.idempotencyKey) {
      this.idempotencyIndex.set(record.idempotencyKey, record.id);
    }
    if (record.status === 'approved') {
      if (record.beforeHash) this.rewardedHashes.add(record.beforeHash);
      if (record.afterHash) this.rewardedHashes.add(record.afterHash);
    }
    this.persist();
  }

  public findByIdempotency(key: string): CleanupSubmissionRecord | undefined {
    const id = this.idempotencyIndex.get(key);
    if (!id) return undefined;
    return this.inMemory.get(id);
  }

  public findById(id: string): CleanupSubmissionRecord | undefined {
    return this.inMemory.get(id);
  }

  public hasHashBeenRewarded(hash: string): boolean {
    if (!hash) return false;
    return this.rewardedHashes.has(hash);
  }

  public getAll(): CleanupSubmissionRecord[] {
    return Array.from(this.inMemory.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public clearAll(): void {
    this.inMemory.clear();
    this.idempotencyIndex.clear();
    this.rewardedHashes.clear();
    this.persist();
  }
}

export const submissionStore = new SubmissionRepository();
