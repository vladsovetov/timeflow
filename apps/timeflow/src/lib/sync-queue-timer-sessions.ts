import {
  postApiV1TimerSessions,
  patchApiV1TimerSessionsId,
} from "@acme/api-client";
import { syncQueue, registerExecutor, type SyncOp } from "./sync-queue";

export type CreateSessionPayload = {
  timerId: string;
  startedAt: string;
  endedAt?: string | null;
};

export type EndSessionPayload = {
  sessionId: string;
  endedAt: string;
};

const CREATE_SESSION = "create-session";
const END_SESSION = "end-session";

function initExecutors(): void {
  registerExecutor<CreateSessionPayload>(CREATE_SESSION, async (payload) => {
    const res = await postApiV1TimerSessions({
      timer_id: payload.timerId,
      started_at: payload.startedAt,
      ended_at: payload.endedAt ?? undefined,
    });
    if (res.status !== 201) {
      throw new Error(`Create session failed: ${res.status}`);
    }
  });

  registerExecutor<EndSessionPayload>(END_SESSION, async (payload) => {
    const res = await patchApiV1TimerSessionsId(payload.sessionId, {
      ended_at: payload.endedAt,
    });
    if (res.status !== 200) {
      throw new Error(`End session failed: ${res.status}`);
    }
  });
}

initExecutors();

/**
 * Timer-session-specific API on top of the generic sync queue.
 */
export const syncQueueTimerSessions = {
  enqueueCreateSession(payload: CreateSessionPayload): Promise<void> {
    return syncQueue.enqueue(CREATE_SESSION, payload);
  },

  enqueueEndSession(payload: EndSessionPayload): Promise<void> {
    return syncQueue.enqueue(END_SESSION, payload);
  },

  /**
   * Merge a pending CreateSession with endedAt (start+pause into one POST).
   */
  async updateCreateSessionWithEndedAt(
    timerId: string,
    endedAt: string
  ): Promise<boolean> {
    return syncQueue.findAndUpdate(
      (op) =>
        op.type === CREATE_SESSION &&
        (op.payload as CreateSessionPayload).timerId === timerId &&
        (op.payload as CreateSessionPayload).endedAt == null,
      (op) => ({
        ...op,
        payload: {
          ...(op.payload as CreateSessionPayload),
          endedAt,
        },
      })
    );
  },
};

export function isTimerSessionOp(
  op: SyncOp
): op is SyncOp<CreateSessionPayload | EndSessionPayload> {
  return op.type === CREATE_SESSION || op.type === END_SESSION;
}

/**
 * Returns timer ids that have a pending create-session op with no endedAt (in-progress overlay for offline-first).
 */
export async function getPendingInProgressSessions(): Promise<
  Map<string, { started_at: string; tempId: string }>
> {
  const ops = await syncQueue.getAll();
  const map = new Map<string, { started_at: string; tempId: string }>();
  for (const op of ops) {
    if (op.type === CREATE_SESSION) {
      const p = op.payload as CreateSessionPayload;
      if (p.endedAt == null) {
        map.set(p.timerId, { started_at: p.startedAt, tempId: `pending-${op.id}` });
      }
    }
  }
  return map;
}
