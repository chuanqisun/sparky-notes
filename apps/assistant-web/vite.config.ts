import preact from "@preact/preset-vite";
import { resolve } from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  base: "",
  plugins: [preact()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        card: resolve(__dirname, "card.html"),
        debug: resolve(__dirname, "debug.html"),
        signIn: resolve(__dirname, "sign-in.html"),
        authRedirect: resolve(__dirname, "auth-redirect.html"),
      },
    },
  },
});
