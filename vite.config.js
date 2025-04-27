import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);

export default {
  root: join(dirname(path), "client"),
  plugins: [react()],
  server: {
    port: 3001,
    ws: {
      port: 24679 // Change from 24678 to something else
    }
  }
};