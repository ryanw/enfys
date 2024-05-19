import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		// FIXME this doesn't work, --ignore-pattern in package.json is used instead
		ignores: ['src/wgsl_loader.mjs'],
		languageOptions: {
			globals: globals.browser
		},
		rules: {
			"indent": [
				"error",
				"tab"
			],
			"linebreak-style": [
				"error",
				"unix"
			],
			"quotes": [
				"error",
				"single",
				{ "avoidEscape": true }
			],
			"semi": [
				"error",
				"always"
			],
			"no-unused-vars": [
				"off"
			],
			"@typescript-eslint/no-unused-vars": [
				"warn"
			],
			"@typescript-eslint/no-explicit-any": [
				"off"
			],
			"no-constant-condition": [
				"error",
				{ "checkLoops": false }
			]
		}
	},
];
