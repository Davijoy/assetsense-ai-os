import { defineConfig } from "vitest/config";

// Standalone Vitest config — do NOT extend the project's vite.config.ts.
// The TanStack Start plugin assumes a full dev-server environment and
// throws "Cannot read properties of undefined (reading 'client')" when
// loaded inside Vitest.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});