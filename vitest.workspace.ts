import { ssr } from "solid-js/web";
import solid from "vite-plugin-solid";
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "vitest.config.ts",
    plugins: [solid()],
    test: {
      name: "browser",
      include: ["./test/**/*.browser.test.{ts,tsx}"],
      isolate: true,
      globals: true,
      browser: {
        enabled: true,
        headless: true,
        name: "chromium",
        provider: "playwright"
      }
    },
    resolve: { conditions: ["browser", "development"] }
  },
  {
    extends: "vitest.config.ts",
    plugins: [
      solid({
        ssr: true
      })
    ],
    test: {
      name: "node",
      isolate: false,
      include: ["./test/**/*.test.{ts,tsx}"],
      exclude: ["./test/**/*.browser.test.{ts,tsx}"],
      environment: "node"
    },
    resolve: { conditions: ["node"] }
  }
]);
