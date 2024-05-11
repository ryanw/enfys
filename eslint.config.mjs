import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
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
				"warn"
			],
			"no-constant-condition": [
				"error",
				{ "checkLoops": false }
			]
		}
	},
];
