import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Vitest runs outside Next's RSC bundler; the guard is a no-op here.
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
});
