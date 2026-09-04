import obsidianmd from "eslint-plugin-obsidianmd";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import vitest from "@vitest/eslint-plugin";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import tseslint from "typescript-eslint";
import local from "./eslint-plugin-local.mts";

const noObjectAssign = {
	object: "Object",
	property: "assign",
	message: "Use object spread instead of Object.assign.",
};

const localStorageMessage = "Use KeyValueStore instead of localStorage.";

const noLocalStorage = [
	{
		object: "window",
		property: "localStorage",
		message: localStorageMessage,
	},
	{
		object: "globalThis",
		property: "localStorage",
		message: localStorageMessage,
	},
];

export default defineConfig(
	{
		name: "local/base",
		extends: [obsidianmd.configs.recommended],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.mts",
						"eslint-plugin-local.mts",
						"stylelint.config.mjs",
						"manifest.json",
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
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
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"stylelint-plugin-local.mjs",
		"bin/version-bump.mjs",
		"versions.json",
		"main.js",
		"vitest.config.ts",
		"vitest.setup.ts",
	]),
	{
		// This file sits outside tsconfig.json's project (see allowDefaultProject
		// above), so typescript-eslint falls back to an isolated single-file
		// program that can't resolve `import.meta.dirname`'s type.
		name: "local/config-file-type-info",
		files: ["eslint.config.mts"],
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
		},
	},
	{
		name: "local/ts",
		files: ["**/*.{ts,tsx}"],
		extends: [
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
			reactHooks.configs.flat.recommended,
		],
		rules: {
			"import/no-cycle": "error",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{ allowNumber: true },
			],
			"@typescript-eslint/no-empty-function": [
				"error",
				{ allow: ["arrowFunctions", "methods", "constructors"] },
			],
			"@typescript-eslint/non-nullable-type-assertion-style": "off", // Conflicts with no-non-null-assertion
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ fixStyle: "inline-type-imports" },
			],
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"@typescript-eslint/strict-boolean-expressions": "error",
			"@typescript-eslint/no-shadow": "error",
			"@typescript-eslint/member-ordering": "error",
			eqeqeq: ["error", "always", { null: "ignore" }],
			"no-restricted-properties": ["error", noObjectAssign],
		},
	},
	{
		name: "local/ts-prodonly",
		files: ["src/**/*.{ts,tsx}"],
		ignores: ["**/*.test.{ts,tsx}"],
		plugins: {
			local,
		},
		rules: {
			"local/require-dispose": "error",
			"import/no-extraneous-dependencies": [
				"error",
				{
					devDependencies: false,
					optionalDependencies: false,
				},
			],
			"@typescript-eslint/consistent-type-assertions": [
				"error",
				{ assertionStyle: "never" },
			],
			"no-restricted-globals": [
				"error",
				{ name: "localStorage", message: localStorageMessage },
			],
			"no-restricted-properties": [
				"error",
				noObjectAssign,
				...noLocalStorage,
			],
			"no-restricted-syntax": [
				"error",
				{
					selector: "PropertyDefinition[definite=true]",
					message:
						"Type the property as possibly undefined instead of asserting definite assignment.",
				},
				{
					selector: "VariableDeclarator[definite=true]",
					message:
						"Type the variable as possibly undefined instead of asserting definite assignment.",
				},
			],
		},
	},
	{
		name: "local/key-value-store",
		files: ["src/key-value-store.ts"],
		rules: {
			"no-restricted-globals": "off",
			"no-restricted-properties": ["error", noObjectAssign],
		},
	},
	{
		name: "local/restrict-obsidian-imports",
		files: ["**/*.{ts,tsx}"],
		ignores: ["**/obsidian*.{ts,tsx}", "index.ts"],
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
		name: "local/test-files",
		files: ["**/*.test.{ts,tsx}"],
		extends: [
			vitest.configs.recommended,
			testingLibrary.configs["flat/dom"],
			jestDom.configs["flat/recommended"],
		],
		plugins: {
			local,
		},
		rules: {
			"local/vitest-aaa-order": "error",
		},
	},
	{
		name: "local/model-test-files",
		files: ["**/*.model.test.{ts,tsx}"],
		rules: {
			"vitest/no-standalone-expect": "off",
			"local/vitest-aaa-order": "off",
		},
	},
	{
		name: "local/obsidian-fakes",
		files: ["src/obsidian-globals-fake.ts", "src/obsidian-fake.ts"],
		rules: {
			"obsidianmd/prefer-create-el": "off",
			"@typescript-eslint/no-extraneous-class": "off",
			"@typescript-eslint/no-useless-constructor": "off",
		},
	},
);
