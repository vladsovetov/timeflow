import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const TimerSessionSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    user_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
    timer_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440002" }),
    started_at: z.string().datetime().openapi({ example: "2025-01-25T12:00:00.000Z" }),
    ended_at: z.string().datetime().nullable().openapi({ example: null }),
    source: z.string().openapi({ example: "manual" }),
    note: z.string().nullable().openapi({ example: null }),
    is_deleted: z.boolean().openapi({ example: false }),
    created_at: z.string().datetime().openapi({ example: "2025-01-25T12:00:00.000Z" }),
    updated_at: z.string().datetime().openapi({ example: "2025-01-25T12:00:00.000Z" }),
    updated_by: z.string().uuid().nullable().openapi({ example: null }),
  })
  .openapi("TimerSession");

export const TimerSessionResponseSchema = z
  .object({
    data: TimerSessionSchema,
  })
  .openapi("TimerSessionResponse");

export const CreateTimerSessionRequestSchema = z
  .object({
    timer_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440002" }),
    started_at: z.string().datetime().optional().openapi({ example: "2025-01-25T12:00:00.000Z" }),
    ended_at: z.string().datetime().nullable().optional().openapi({ example: null }),
    source: z.string().optional().openapi({ example: "manual" }),
    note: z.string().nullable().optional().openapi({ example: null }),
  })
  .openapi("CreateTimerSessionRequest");

export const TimerSessionListResponseSchema = z
  .object({
    data: z.array(TimerSessionSchema),
  })
  .openapi("TimerSessionListResponse");

export const UpdateTimerSessionRequestSchema = z
  .object({
    ended_at: z.string().datetime().openapi({ example: "2025-01-25T13:00:00.000Z" }),
  })
  .openapi("UpdateTimerSessionRequest");

export type TimerSession = z.infer<typeof TimerSessionSchema>;
export type TimerSessionResponse = z.infer<typeof TimerSessionResponseSchema>;
export type TimerSessionListResponse = z.infer<typeof TimerSessionListResponseSchema>;
export type CreateTimerSessionRequest = z.infer<typeof CreateTimerSessionRequestSchema>;
export type UpdateTimerSessionRequest = z.infer<typeof UpdateTimerSessionRequestSchema>;
