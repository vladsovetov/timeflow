import { defineConfig } from "orval";

export default defineConfig({
  timeflow: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "single",
      target: "./src/generated.ts",
      schemas: "./src/models",
      client: "react-query",
      httpClient: "fetch",
      override: {
        mutator: {
          path: "./src/customFetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
