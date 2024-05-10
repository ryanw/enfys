import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		"rules": {
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
	}
];
