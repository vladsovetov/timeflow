import {
  postApiV1TimerSessions,
  patchApiV1TimerSessionsId,
  deleteApiV1TimerSessionsId,
} from "@acme/api-client";
import type { UpdateTimerSessionRequest } from "@acme/api-client";
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

export type UpdateSessionPayload = {
  sessionId: string;
  data: UpdateTimerSessionRequest;
};

export type DeleteSessionPayload = {
  sessionId: string;
};

const CREATE_SESSION = "create-session";
const END_SESSION = "end-session";
const UPDATE_SESSION = "update-timer-session";
const DELETE_SESSION = "delete-timer-session";

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

  registerExecutor<UpdateSessionPayload>(UPDATE_SESSION, async (payload) => {
    const res = await patchApiV1TimerSessionsId(payload.sessionId, payload.data);
    if (res.status !== 200) {
      throw new Error(`Update session failed: ${res.status}`);
    }
  });

  registerExecutor<DeleteSessionPayload>(DELETE_SESSION, async (payload) => {
    const res = await deleteApiV1TimerSessionsId(payload.sessionId);
    if (res.status !== 204) {
      throw new Error(`Delete session failed: ${res.status}`);
    }
  });
}

initExecutors();

/** Stable client-side session id for optimistic UI and queue correlation. */
export function pendingSessionLocalId(opId: string): string {
  return `pending-${opId}`;
}

/**
 * Timer-session-specific API on top of the generic sync queue.
 */
export const syncQueueTimerSessions = {
  enqueueCreateSession(payload: CreateSessionPayload): Promise<SyncOp<CreateSessionPayload>> {
    return syncQueue.enqueue(CREATE_SESSION, payload);
  },

  enqueueEndSession(payload: EndSessionPayload): Promise<SyncOp<EndSessionPayload>> {
    return syncQueue.enqueue(END_SESSION, payload);
  },

  enqueueUpdateSession(payload: UpdateSessionPayload): Promise<SyncOp<UpdateSessionPayload>> {
    return syncQueue.enqueue(UPDATE_SESSION, payload);
  },

  enqueueDeleteSession(payload: DeleteSessionPayload): Promise<SyncOp<DeleteSessionPayload>> {
    return syncQueue.enqueue(DELETE_SESSION, payload);
  },

  /**
   * Merge a pending CreateSession with endedAt (start+pause into one POST).
   */
  async updateCreateSessionWithEndedAt(
    timerId: string,
    endedAt: string
  ): Promise<boolean> {
    const updated = await syncQueue.findAndUpdate(
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
    if (updated) {
      void syncQueue.process();
    }
    return updated;
  },
};

export function isTimerSessionOp(
  op: SyncOp
): op is SyncOp<
  CreateSessionPayload | EndSessionPayload | UpdateSessionPayload | DeleteSessionPayload
> {
  return (
    op.type === CREATE_SESSION ||
    op.type === END_SESSION ||
    op.type === UPDATE_SESSION ||
    op.type === DELETE_SESSION
  );
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
        map.set(p.timerId, {
          started_at: p.startedAt,
          tempId: pendingSessionLocalId(op.id),
        });
      }
    }
  }
  return map;
}
