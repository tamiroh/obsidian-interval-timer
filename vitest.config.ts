import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
	test: {
		environment: "jsdom",
		coverage: {
			reporter: ["json"],
			include: ["src/**/*.ts"],
		},
	},
});
