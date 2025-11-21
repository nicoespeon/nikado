import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		clearMocks: true,
		coverage: {
			all: true,
			include: ["src"],
			reporter: ["html", "lcov"],
		},
		environment: "jsdom",
		exclude: ["lib", "node_modules"],
		setupFiles: ["console-fail-test/setup", "./src/test-setup.ts"],
	},
});
