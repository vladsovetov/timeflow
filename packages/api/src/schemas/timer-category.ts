import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const TimerCategorySchema = z
  .object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    user_id: z.string().uuid().nullable().openapi({ example: null, description: "Null for system categories" }),
    name: z.string().openapi({ example: "Useful" }),
    color: z.string().openapi({ example: "#22c55e" }),
    sort_order: z.number().openapi({ example: 0 }),
  })
  .openapi("TimerCategory");

export const TimerCategoryListResponseSchema = z
  .object({
    data: z.array(TimerCategorySchema),
  })
  .openapi("TimerCategoryListResponse");

export const CreateTimerCategoryRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ example: "My Category" }),
    color: z.string().min(1).openapi({ example: "#3b82f6" }),
  })
  .openapi("CreateTimerCategoryRequest");

export type TimerCategory = z.infer<typeof TimerCategorySchema>;
export type TimerCategoryListResponse = z.infer<typeof TimerCategoryListResponseSchema>;
export type CreateTimerCategoryRequest = z.infer<typeof CreateTimerCategoryRequestSchema>;
