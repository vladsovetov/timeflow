import { syncQueueTimerSessions } from "@/src/lib/sync-queue-timer-sessions";
import { syncQueue } from "@/src/lib/sync-queue";

/** Session id is not yet persisted on the server (optimistic or queued). */
export function isLocalPendingSessionId(id: string | null): boolean {
  return id != null && (id.startsWith("temp-") || id.startsWith("pending-"));
}

export type EnqueuePauseTimerSessionInput = {
  timerId: string;
  sessionId: string;
  startedAt: string;
  endedAt: string;
};

/**
 * Persists pausing the running session (merge queued create, or PATCH end on server via sync queue).
 */
export async function enqueuePauseTimerSessionOnServer(
  input: EnqueuePauseTimerSessionInput
): Promise<void> {
  const { timerId, sessionId, startedAt, endedAt } = input;

  if (isLocalPendingSessionId(sessionId)) {
    const merged = await syncQueueTimerSessions.updateCreateSessionWithEndedAt(timerId, endedAt);
    if (merged) return;
    await syncQueueTimerSessions.enqueueCreateSession({
      timerId,
      startedAt,
      endedAt,
    });
    void syncQueue.process();
    return;
  }

  await syncQueueTimerSessions.enqueueEndSession({
    sessionId,
    endedAt,
  });
  void syncQueue.process();
}
