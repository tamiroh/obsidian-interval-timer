import obsidianmd from "eslint-plugin-obsidianmd";
import reactHooks from "eslint-plugin-react-hooks";
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
	{
		extends: [
			obsidianmd.configs.recommended,
			reactHooks.configs.flat.recommended,
		],
		settings: {
			"import/resolver": {
				node: {
					extensions: [".js", ".ts", ".tsx"],
				},
			},
			"import/parsers": {
				"@typescript-eslint/parser": [".ts", ".tsx"],
			},
		},
		rules: {
			"import/no-cycle": "error",
		},
	},
	{
		files: ["**/*.test.{ts,tsx}"],
		extends: [vitest.configs.recommended],
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
	{
		files: ["src/**/*.{ts,tsx}"],
		ignores: ["**/*.test.{ts,tsx}"],
		rules: {
			"import/no-extraneous-dependencies": [
				"error",
				{
					devDependencies: false,
					optionalDependencies: false,
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
