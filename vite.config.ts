import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Loads .env files; only VITE_* are exposed to the client
  const env = loadEnv(mode, process.cwd());

  return {
    // Your app lives at /cindybot.github.io/
    base: "/cindybot",

    plugins: [],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
