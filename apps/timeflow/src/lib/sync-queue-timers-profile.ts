import {
  postApiV1Timers,
  patchApiV1TimersId,
  deleteApiV1TimersId,
  patchApiV1TimersReorder,
  patchApiV1Me,
} from "@acme/api-client";
import type {
  CreateTimerRequest,
  UpdateTimerRequest,
  ReorderTimersRequest,
  UpdateProfileRequest,
} from "@acme/api-client";
import { syncQueue, registerExecutor, type SyncOp } from "./sync-queue";

const CREATE_TIMER = "create-timer";
const UPDATE_TIMER = "update-timer";
const DELETE_TIMER = "delete-timer";
const REORDER_TIMERS = "reorder-timers";
const UPDATE_PROFILE = "update-profile";

export type CreateTimerPayload = CreateTimerRequest;

export type UpdateTimerPayload = {
  id: string;
  data: UpdateTimerRequest;
};

export type DeleteTimerPayload = {
  id: string;
};

export type ReorderTimersPayload = ReorderTimersRequest;

function initExecutors(): void {
  registerExecutor<CreateTimerPayload>(CREATE_TIMER, async (payload) => {
    const res = await postApiV1Timers(payload);
    if (res.status !== 201) {
      throw new Error(`Create timer failed: ${res.status}`);
    }
  });

  registerExecutor<UpdateTimerPayload>(UPDATE_TIMER, async (payload) => {
    const res = await patchApiV1TimersId(payload.id, payload.data);
    if (res.status !== 200) {
      throw new Error(`Update timer failed: ${res.status}`);
    }
  });

  registerExecutor<DeleteTimerPayload>(DELETE_TIMER, async (payload) => {
    const res = await deleteApiV1TimersId(payload.id);
    if (res.status !== 204) {
      throw new Error(`Delete timer failed: ${res.status}`);
    }
  });

  registerExecutor<ReorderTimersPayload>(REORDER_TIMERS, async (payload) => {
    const res = await patchApiV1TimersReorder(payload);
    if (res.status !== 200) {
      throw new Error(`Reorder timers failed: ${res.status}`);
    }
  });

  registerExecutor<UpdateProfileRequest>(UPDATE_PROFILE, async (payload) => {
    const res = await patchApiV1Me(payload);
    if (res.status !== 200) {
      throw new Error(`Update profile failed: ${res.status}`);
    }
  });
}

initExecutors();

export const syncQueueTimersProfile = {
  enqueueCreateTimer(payload: CreateTimerPayload): Promise<SyncOp<CreateTimerPayload>> {
    return syncQueue.enqueue(CREATE_TIMER, payload);
  },

  enqueueUpdateTimer(payload: UpdateTimerPayload): Promise<SyncOp<UpdateTimerPayload>> {
    return syncQueue.enqueue(UPDATE_TIMER, payload);
  },

  enqueueDeleteTimer(payload: DeleteTimerPayload): Promise<SyncOp<DeleteTimerPayload>> {
    return syncQueue.enqueue(DELETE_TIMER, payload);
  },

  enqueueReorderTimers(payload: ReorderTimersPayload): Promise<SyncOp<ReorderTimersPayload>> {
    return syncQueue.enqueue(REORDER_TIMERS, payload);
  },

  enqueueUpdateProfile(
    payload: UpdateProfileRequest
  ): Promise<SyncOp<UpdateProfileRequest>> {
    return syncQueue.enqueue(UPDATE_PROFILE, payload);
  },
};

export function isTimersProfileOp(
  op: SyncOp
): op is SyncOp<
  | CreateTimerPayload
  | UpdateTimerPayload
  | DeleteTimerPayload
  | ReorderTimersPayload
  | UpdateProfileRequest
> {
  return (
    op.type === CREATE_TIMER ||
    op.type === UPDATE_TIMER ||
    op.type === DELETE_TIMER ||
    op.type === REORDER_TIMERS ||
    op.type === UPDATE_PROFILE
  );
}
