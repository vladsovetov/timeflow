import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { MeResponseSchema, UpdateProfileRequestSchema, ErrorResponseSchema } from "./schemas/me.js";
import {
  TimerSchema,
  TimerListResponseSchema,
  TimerResponseSchema,
  CreateTimerRequestSchema,
  UpdateTimerRequestSchema,
  TimerSessionInProgressSchema,
} from "./schemas/timer.js";
import {
  TimerCategorySchema,
  TimerCategoryListResponseSchema,
  CreateTimerCategoryRequestSchema,
} from "./schemas/timer-category.js";
import {
  TimerSessionSchema,
  TimerSessionResponseSchema,
  TimerSessionListResponseSchema,
  CreateTimerSessionRequestSchema,
  UpdateTimerSessionRequestSchema,
} from "./schemas/timer-session.js";
import {
  TimerStatsResponseSchema,
} from "./schemas/timer-stats.js";

extendZodWithOpenApi(z);

// Create the registry
export const registry = new OpenAPIRegistry();

// Register schemas
registry.register("MeResponse", MeResponseSchema);
registry.register("UpdateProfileRequest", UpdateProfileRequestSchema);
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("TimerSessionInProgress", TimerSessionInProgressSchema);
registry.register("Timer", TimerSchema);
registry.register("TimerListResponse", TimerListResponseSchema);
registry.register("TimerResponse", TimerResponseSchema);
registry.register("CreateTimerRequest", CreateTimerRequestSchema);
registry.register("UpdateTimerRequest", UpdateTimerRequestSchema);
registry.register("TimerCategory", TimerCategorySchema);
registry.register("TimerCategoryListResponse", TimerCategoryListResponseSchema);
registry.register("CreateTimerCategoryRequest", CreateTimerCategoryRequestSchema);
registry.register("TimerSession", TimerSessionSchema);
registry.register("TimerSessionResponse", TimerSessionResponseSchema);
registry.register("TimerSessionListResponse", TimerSessionListResponseSchema);
registry.register("CreateTimerSessionRequest", CreateTimerSessionRequestSchema);
registry.register("UpdateTimerSessionRequest", UpdateTimerSessionRequestSchema);
registry.register("TimerStatsResponse", TimerStatsResponseSchema);

// Register the /api/v1/me endpoint
registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  summary: "Get current user",
  description: "Returns the authenticated user's profile information",
  tags: ["User"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Successful response with user profile",
      content: {
        "application/json": {
          schema: MeResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - no valid session",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/me",
  summary: "Update current user profile",
  description: "Update the authenticated user's profile information",
  tags: ["User"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Profile updated successfully",
      content: {
        "application/json": {
          schema: MeResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - no valid session",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/timer-categories",
  summary: "List timer categories",
  description: "List system categories (Useful, Important, Procrastination) and user's custom categories",
  tags: ["TimerCategory"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of timer categories",
      content: {
        "application/json": {
          schema: TimerCategoryListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/timer-categories",
  summary: "Create custom timer category",
  description: "Create a custom timer category for the current user",
  tags: ["TimerCategory"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTimerCategoryRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Timer category created",
      content: {
        "application/json": {
          schema: z.object({
            data: TimerCategorySchema,
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/example-db",
  summary: "Get example database data",
  description: "Returns example database data",
  tags: ["Database"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Successful response with database data",
      content: {
        "application/json": {
          schema: z.object({
            data: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/timers",
  summary: "List timers",
  description: "List current user's timers (non-deleted)",
  tags: ["Timer"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of timers",
      content: {
        "application/json": {
          schema: TimerListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/timers",
  summary: "Create timer",
  description: "Create a new timer for the current user",
  tags: ["Timer"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTimerRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Timer created",
      content: {
        "application/json": {
          schema: TimerResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict - timer with this name already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/timers/{id}",
  summary: "Get timer",
  description: "Get a single timer by id",
  tags: ["Timer"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Timer",
      content: {
        "application/json": {
          schema: TimerResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/timers/{id}",
  summary: "Update timer",
  description: "Update an existing timer",
  tags: ["Timer"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateTimerRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Timer updated",
      content: {
        "application/json": {
          schema: TimerResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict - timer with this name already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/timers/{id}",
  summary: "Delete timer",
  description: "Soft-delete a timer",
  tags: ["Timer"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Timer deleted",
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/timers/{id}/stats",
  summary: "Get timer statistics",
  description: "Get total timer session time per day for a timer. Optionally filter by date range using start_date and end_date query parameters (DateOnly format: YYYY-MM-DD).",
  tags: ["Timer"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    query: z.object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({
        example: "2025-01-01",
        description: "Start date in YYYY-MM-DD format (DateOnly, optional)"
      }),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({
        example: "2025-01-31",
        description: "End date in YYYY-MM-DD format (DateOnly, optional)"
      }),
    }),
  },
  responses: {
    200: {
      description: "Timer statistics by day",
      content: {
        "application/json": {
          schema: TimerStatsResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - invalid date format or date range",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/timer-sessions",
  summary: "List timer sessions",
  description: "List current user's timer sessions (non-deleted)",
  tags: ["TimerSession"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of timer sessions",
      content: {
        "application/json": {
          schema: TimerSessionListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/timer-sessions",
  summary: "Create timer session",
  description: "Create a new timer session for the current user",
  tags: ["TimerSession"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTimerSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Timer session created",
      content: {
        "application/json": {
          schema: TimerSessionResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict - an active session already exists for this timer",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/timer-sessions/{id}",
  summary: "Update timer session",
  description: "Update an existing timer session (e.g. set end time when pausing)",
  tags: ["TimerSession"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateTimerSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Timer session updated",
      content: {
        "application/json": {
          schema: TimerSessionResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer session not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/timer-sessions/{id}",
  summary: "Delete timer session",
  description: "Soft-delete a timer session",
  tags: ["TimerSession"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: "Timer session deleted",
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Timer session not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Register security scheme
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// Generate the OpenAPI document
export function generateOpenApiDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Timeflow API",
      version: "1.0.0",
      description: "API for the Timeflow application",
    },
    servers: [
      {
        url: "/",
        description: "Current server",
      },
    ],
  });
}
