export type ActiveTimerNotificationSnapshot = {
  timerId: string;
  sessionId: string;
  startedAt: string;
  zone: string;
  timerName: string;
};

let snapshot: ActiveTimerNotificationSnapshot | null = null;
let suppressSync = false;

export function setActiveTimerNotificationSnapshot(
  next: ActiveTimerNotificationSnapshot | null
): void {
  snapshot = next;
}

export function getActiveTimerNotificationSnapshot(): ActiveTimerNotificationSnapshot | null {
  return snapshot;
}

export function clearActiveTimerNotificationSnapshot(): void {
  snapshot = null;
}

export function setSuppressActiveTimerNotificationSync(value: boolean): void {
  suppressSync = value;
}

export function getSuppressActiveTimerNotificationSync(): boolean {
  return suppressSync;
}
