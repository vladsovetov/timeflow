import { defineConfig } from "orval";

export default defineConfig({
  timeflow: {
    input: {
      target: "http://localhost:3000/api/openapi",
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
