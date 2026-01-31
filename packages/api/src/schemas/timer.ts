import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { TimerCategorySchema } from "./timer-category.js";

extendZodWithOpenApi(z);

export const TimerSessionInProgressSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440003" }),
    started_at: z.string().datetime().openapi({ example: "2025-01-25T12:00:00.000Z", description: "When the current session started" }),
  })
  .openapi("TimerSessionInProgress");

export const TimerSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    user_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
    timer_type: z.string().openapi({ example: "work" }),
    category_id: z.string().uuid().nullable().openapi({ example: "550e8400-e29b-41d4-a716-446655440002" }),
    category: TimerCategorySchema.nullable().openapi({ description: "The timer's category (Useful, Important, Procrastination, or custom)" }),
    name: z.string().openapi({ example: "Deep work" }),
    color: z.string().nullable().openapi({ example: "#3b82f6" }),
    sort_order: z.number().openapi({ example: 0 }),
    min_time: z.number().nullable().openapi({ example: 300, description: "Minimum session duration in seconds" }),
    is_archived: z.boolean().openapi({ example: false }),
    is_deleted: z.boolean().openapi({ example: false }),
    created_at: z.string().datetime().openapi({ example: "2025-01-25T12:00:00.000Z" }),
    updated_at: z.string().datetime().openapi({ example: "2025-01-25T12:00:00.000Z" }),
    updated_by: z.string().uuid().nullable().openapi({ example: null }),
    total_timer_session_time: z.number().openapi({ example: 3600, description: "Total timer session time for current day in seconds" }),
    timer_session_in_progress: TimerSessionInProgressSchema.nullable().openapi({
      example: { id: "550e8400-e29b-41d4-a716-446655440003", started_at: "2025-01-25T12:00:00.000Z" },
      description: "The timer session currently in progress (started_at set, no ended_at), or null",
    }),
  })
  .openapi("Timer");

export const TimerListResponseSchema = z
  .object({
    data: z.array(TimerSchema),
  })
  .openapi("TimerListResponse");

export const TimerResponseSchema = z
  .object({
    data: TimerSchema,
  })
  .openapi("TimerResponse");

export const CreateTimerRequestSchema = z
  .object({
    timer_type: z.string().min(1).openapi({ example: "work" }),
    category_id: z.string().uuid().optional().openapi({ example: "550e8400-e29b-41d4-a716-446655440002", description: "Timer category ID (Useful, Important, Procrastination, or custom)" }),
    name: z.string().min(1).openapi({ example: "Deep work" }),
    color: z.string().optional().openapi({ example: "#3b82f6" }),
    sort_order: z.number().optional().openapi({ example: 0 }),
    min_time: z.number().optional().openapi({ example: 300, description: "Minimum session duration in seconds" }),
    is_archived: z.boolean().optional().openapi({ example: false }),
  })
  .openapi("CreateTimerRequest");

export const UpdateTimerRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ example: "Deep work" }),
    color: z.string().optional().openapi({ example: "#3b82f6" }),
    sort_order: z.number().optional().openapi({ example: 0 }),
    min_time: z.number().nullable().optional().openapi({ example: 300, description: "Minimum session duration in seconds" }),
    is_archived: z.boolean().optional().openapi({ example: false }),
    timer_type: z.string().min(1).optional().openapi({ example: "focus" }),
    category_id: z.string().uuid().nullable().optional().openapi({ description: "Timer category ID or null to clear" }),
  })
  .openapi("UpdateTimerRequest");

export type Timer = z.infer<typeof TimerSchema>;
export type TimerListResponse = z.infer<typeof TimerListResponseSchema>;
export type TimerResponse = z.infer<typeof TimerResponseSchema>;
export type CreateTimerRequest = z.infer<typeof CreateTimerRequestSchema>;
export type UpdateTimerRequest = z.infer<typeof UpdateTimerRequestSchema>;
