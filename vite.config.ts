import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // @digitalpersona/devices does `import 'WebSdk'` (side-effect only) and
      // uses the global WebSdk provided by the script tag in index.html. Point
      // the bare specifier at an empty shim so the bundler can resolve it.
      WebSdk: path.resolve(__dirname, "./src/lib/websdk-shim.ts"),
    },
  },
}));
