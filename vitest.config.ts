import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	resolve: {
		alias: {
			obsidian: fileURLToPath(
				new URL("./src/obsidian-fake.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			reporter: ["json"],
			include: ["src/**/*.ts"],
		},
	},
});
