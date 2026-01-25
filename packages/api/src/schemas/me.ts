import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// Success response schema
export const MeResponseSchema = z
  .object({
    userId: z.string().openapi({ example: "user_2abc123def456" }),
    first_name: z.string().nullable().openapi({ example: "John" }),
    last_name: z.string().nullable().openapi({ example: "Doe" }),
    timezone: z.string().nullable().openapi({ example: "America/New_York" }),
  })
  .openapi("MeResponse");

// Update profile request schema
export const UpdateProfileRequestSchema = z
  .object({
    first_name: z.string().optional().openapi({ example: "John" }),
    last_name: z.string().optional().openapi({ example: "Doe" }),
    timezone: z.string().optional().openapi({ example: "America/New_York" }),
  })
  .openapi("UpdateProfileRequest");

// Error response schema
export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: "Unauthorized" }),
  })
  .openapi("ErrorResponse");

// Inferred types
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
