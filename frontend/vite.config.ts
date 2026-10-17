// vite.config.ts
// Build tool settings. The plugin lets Vite understand React files.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
