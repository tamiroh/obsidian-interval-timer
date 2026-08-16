/** @type {import("stylelint").Config} */
export default {
	extends: ["stylelint-config-standard"],
	plugins: ["./stylelint-plugin-local.mjs"],
	rules: {
		"local/selector-class-module-pattern": true,
	},
	overrides: [
		{
			files: ["src/popover.css"],
			rules: {
				"local/selector-class-module-pattern": [
					true,
					{ allowModules: ["status-bar"] },
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
