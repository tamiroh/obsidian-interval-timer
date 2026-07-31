import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import vitest from "@vitest/eslint-plugin";

export default defineConfig(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.test.{ts,tsx}"],
		plugins: {
			vitest,
		},
		rules: {
			...vitest.configs.recommended.rules,
		},
	},
	{
		files: ["src/obsidian-globals-fake.ts", "src/obsidian-fake.ts"],
		rules: {
			"obsidianmd/prefer-create-el": "off",
		},
	},
	{
		files: ["**/*.{ts,tsx}"],
		ignores: ["**/obsidian*.{ts,tsx}"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							regex: "(^|/)obsidian(-.*)?$",
							message:
								"Only modules with an `obsidian` prefix are allowed to depend on obsidian.",
						},
					],
				},
			],
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"bin/version-bump.mjs",
		"versions.json",
		"main.js",
		"vitest.config.ts",
		"vitest.setup.ts",
	]),
);
