import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig(({ mode }) => {
  // to test in server environment, run with "--mode ssr" or "--mode test:ssr" flag
  // loads only server.test.ts file
  const testSSR = mode === "test:ssr" || mode === "ssr";

  return {
    plugins: [
      solidPlugin({
        // https://github.com/solidjs/solid-refresh/issues/29
        hot: false,
        // For testing SSR we need to do a SSR JSX transform
        solid: { generate: testSSR ? "ssr" : "dom" }
      })
    ],
    test: {
      coverage: {
        provider: "v8",
        include: ["src/**"],
        reporter: ["text", "html"]
      },
      watch: false,
      isolate: !testSSR,
      environment: testSSR ? "node" : "jsdom",
      transformMode: { web: [/\.[jt]sx$/] },
      css: true,
      ...(testSSR
        ? {
            include: ["test/server.test.{ts,tsx}"]
          }
        : {
            include: ["test/**/*.test.{ts,tsx}"],
            exclude: ["test/server.test.{ts,tsx}"]
          }),
      // optimisation
      maxConcurrency: 20,
    },
    resolve: {
      conditions: testSSR ? ["node"] : ["browser", "development"]
    }
  };
});
