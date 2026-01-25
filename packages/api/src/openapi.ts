import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { MeResponseSchema, ErrorResponseSchema } from "./schemas/me.js";
import {
  TimerSchema,
  TimerListResponseSchema,
  TimerResponseSchema,
  CreateTimerRequestSchema,
  UpdateTimerRequestSchema,
} from "./schemas/timer.js";

extendZodWithOpenApi(z);

// Create the registry
export const registry = new OpenAPIRegistry();

// Register schemas
registry.register("MeResponse", MeResponseSchema);
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("Timer", TimerSchema);
registry.register("TimerListResponse", TimerListResponseSchema);
registry.register("TimerResponse", TimerResponseSchema);
registry.register("CreateTimerRequest", CreateTimerRequestSchema);
registry.register("UpdateTimerRequest", UpdateTimerRequestSchema);

// Register the /api/v1/me endpoint
registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  summary: "Get current user",
  description: "Returns the authenticated user's ID",
  tags: ["User"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Successful response with user ID",
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
