/** @type {import("stylelint").Config} */
export default {
	extends: ["stylelint-config-standard", "stylelint-config-recess-order"],
	plugins: ["./stylelint-plugin-local.mjs", "stylelint-order"],
	reportNeedlessDisables: true,
	reportInvalidScopeDisables: true,
	reportDescriptionlessDisables: true,
	rules: {
		"local/selector-class-module-pattern": true,
		"declaration-no-important": true,
		"function-linear-gradient-no-nonstandard-direction": true,
		"max-nesting-depth": 3,
		"no-unknown-animations": true,
		"no-unknown-custom-media": true,
		"selector-max-id": [0],
		"time-min-milliseconds": 100,
	},
	overrides: [
		{
			files: ["src/status-bar.css"],
			rules: {
				"local/selector-class-module-pattern": [
					true,
					{ allowModules: ["popover"] },
				],
			},
		},
		{
			files: ["src/obsidian-floating-timer.css"],
			rules: {
				"local/selector-class-module-pattern": [
					true,
					{ allowModules: ["popover"] },
				],
			},
		},
		{
			files: ["src/obsidian-task-line-highlight-extension.css"],
			rules: {
				"local/selector-class-module-pattern": [
					true,
					{ moduleOverride: "task-line-highlight" },
				],
			},
		},
	],
};
