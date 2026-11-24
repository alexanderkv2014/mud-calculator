import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      server: {
        entry: "server",
      },
    }),
    // Nitro нужен только при сборке, как и было у Lovable
    ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
    react(),
  ],

  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },

  server: {
    host: "::",
    port: 8080,
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
}));
