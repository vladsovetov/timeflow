import type { JSX } from "react";

export default function Home(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Timeflow API</h1>
      <p>
        API documentation available at <a href="/api/openapi">/api/openapi</a>
      </p>
    </main>
  );
}
