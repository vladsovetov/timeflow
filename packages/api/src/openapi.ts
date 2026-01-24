import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas30";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { MeResponseSchema, ErrorResponseSchema } from "./schemas/me.js";

extendZodWithOpenApi(z);

// Create the registry
export const registry = new OpenAPIRegistry();

// Register schemas
registry.register("MeResponse", MeResponseSchema);
registry.register("ErrorResponse", ErrorResponseSchema);

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
