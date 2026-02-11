import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
	test: {
		environment: "jsdom",
		coverage: {
			reporter: ["json"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/main.ts",
				"src/notifier.ts",
				"src/retime-modal.ts",
				"src/setting-tab.ts",
				"src/status-bar.ts",
				"src/task-tracker.ts",
			],
		},
	},
});
