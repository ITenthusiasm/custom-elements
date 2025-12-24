import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import solid from "vite-plugin-solid";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [
    react({
      include: [
        "library-tests/form-observer/react/**",
        "library-tests/react-hook-form/**",
        "framework-enhancement-tests/react/**",
      ],
    }),
    solid({ include: ["library-tests/form-observer/solid/**", "framework-enhancement-tests/solid/**"] }),
    svelte({
      include: ["library-tests/form-observer/svelte/**.svelte", "framework-enhancement-tests/svelte/**.svelte"],
    }),
    vue({
      include: ["library-tests/form-observer/vue/**.vue", "framework-enhancement-tests/vue/**.vue"],
      template: { compilerOptions: { isCustomElement: (tag) => tag.includes("-") } },
    }),
    preact({ include: "library-tests/form-observer/preact/**" }),
  ],
  server: {
    headers: {
      // For `performance.measureUserAgentSpecificMemory()` | https://web.dev/articles/monitor-total-page-memory-usage
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
