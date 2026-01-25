import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const TimerStatsDaySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ 
      example: "2025-01-25",
      description: "Date in YYYY-MM-DD format (DateOnly)"
    }),
    total_timer_session_time: z.number().openapi({ 
      example: 3600,
      description: "Total timer session time for this day in seconds"
    }),
  })
  .openapi("TimerStatsDay");

export const TimerStatsResponseSchema = z
  .object({
    data: z.array(TimerStatsDaySchema),
  })
  .openapi("TimerStatsResponse");

export type TimerStatsDay = z.infer<typeof TimerStatsDaySchema>;
export type TimerStatsResponse = z.infer<typeof TimerStatsResponseSchema>;
