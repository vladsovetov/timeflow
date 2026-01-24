import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// Success response schema
export const MeResponseSchema = z
  .object({
    userId: z.string().openapi({ example: "user_2abc123def456" }),
  })
  .openapi("MeResponse");

// Error response schema
export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: "Unauthorized" }),
  })
  .openapi("ErrorResponse");

// Inferred types
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
