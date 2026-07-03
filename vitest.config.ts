import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["backend/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["backend/src/**/*.ts"],
      exclude: [
        "backend/src/db/migrate.ts",
        "backend/src/db/seed.ts",
        "backend/src/genlayer/client.ts",  // chain client — can't unit test without network
        "backend/src/server.ts",            // entrypoint
      ],
      thresholds: { functions: 60 },
    },
  },
});
