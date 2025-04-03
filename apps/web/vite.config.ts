import preact from "@preact/preset-vite";
import { resolve } from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  base: "",
  plugins: [preact()],
  server: {
    open: "debug.html",
  },
  build: {
    outDir: "../../server/dist/static",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
});
