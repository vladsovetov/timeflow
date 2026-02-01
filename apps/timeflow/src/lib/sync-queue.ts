import AsyncStorage from "@react-native-async-storage/async-storage";
import PQueue from "p-queue";
import { DateTime } from "luxon";

const STORAGE_KEY = "timeflow_sync_queue";

export type SyncOp<T = unknown> = {
  id: string;
  type: string;
  payload: T;
};

type Executor<T = unknown> = (payload: T) => Promise<void>;

const executors = new Map<string, Executor>();

function generateId(): string {
  return `sync-${DateTime.now().toMillis()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function loadOps(): Promise<SyncOp[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SyncOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveOps(ops: SyncOp[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

const queue = new PQueue({ concurrency: 1, timeout: 30000 });

let onProcessedCallback: ((op: SyncOp) => void) | undefined;

/**
 * Register an executor for a given op type. Must be called before processing ops of that type.
 */
export function registerExecutor<T>(type: string, fn: Executor<T>): void {
  executors.set(type, fn as Executor);
}

/**
 * Generic persisted sync queue for offline-first mutation replay.
 * Wraps p-queue + AsyncStorage. Works with any mutation type via registered executors.
 */
export const syncQueue = {
  /**
   * Add a mutation to the queue. Persists to AsyncStorage and processes when possible.
   */
  async enqueue<T>(type: string, payload: T): Promise<void> {
    const op: SyncOp<T> = {
      id: generateId(),
      type,
      payload,
    };
    const ops = await loadOps();
    ops.push(op);
    await saveOps(ops);
    queue.add(() => processOne(op));
  },

  /**
   * Find a pending op matching the predicate and update it. Returns true if updated.
   */
  async findAndUpdate(
    predicate: (op: SyncOp) => boolean,
    updater: (op: SyncOp) => SyncOp | null
  ): Promise<boolean> {
    const ops = await loadOps();
    const idx = ops.findIndex(predicate);
    if (idx === -1) return false;
    const updated = updater(ops[idx]);
    if (updated === null) {
      ops.splice(idx, 1);
    } else {
      ops[idx] = updated;
    }
    await saveOps(ops);
    return true;
  },

  /**
   * Process all queued operations. Call on app focus or when back online.
   */
  async process(): Promise<void> {
    const ops = await loadOps();
    for (const op of ops) {
      queue.add(() => processOne(op));
    }
  },

  /**
   * Get all pending operations (for UI/debugging).
   */
  async getAll(): Promise<SyncOp[]> {
    return loadOps();
  },

  /**
   * Set callback invoked after an op is successfully synced (e.g. invalidate queries).
   */
  setOnProcessed(cb: ((op: SyncOp) => void) | undefined): void {
    onProcessedCallback = cb;
  },
};

async function processOne(op: SyncOp): Promise<void> {
  try {
    const ops = await loadOps();
    if (!ops.some((o) => o.id === op.id)) return; // Already processed

    const executor = executors.get(op.type);
    if (!executor) {
      console.warn(`[SyncQueue] No executor for type "${op.type}"`);
      return;
    }

    await executor(op.payload);

    const updated = await loadOps();
    const filtered = updated.filter((o) => o.id !== op.id);
    await saveOps(filtered);
    onProcessedCallback?.(op);
  } catch {
    // Op stays in queue for retry on next process()
  }
}
