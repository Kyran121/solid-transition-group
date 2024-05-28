import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["src/**"],
      reporter: ["text", "html"]
    },
    watch: false,
    transformMode: { web: [/\.[jt]sx$/] },
    // optimisation
    maxConcurrency: 20
  }
});
