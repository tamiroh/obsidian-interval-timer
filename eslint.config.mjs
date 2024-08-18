import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
	baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	{
		ignores: ["**/node_modules/", "**/main.js"],
	},
	...compat.extends(
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		"airbnb-base",
		"prettier",
	),
	{
		plugins: {
			"@typescript-eslint": typescriptEslint,
		},
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},

			parser: tsParser,
			ecmaVersion: 5,
			sourceType: "module",
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
				},
			],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"no-new": "off",
			"import/prefer-default-export": "off",
			"import/no-unresolved": "off",
			"import/extensions": "off",
			"consistent-return": "off",
			"no-console": "off",
			"class-methods-use-this": "off",
			"import/no-extraneous-dependencies": [
				"error",
				{
					devDependencies: ["src/**/*.test.ts"],
				},
			],
		},
	},
];
