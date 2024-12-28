import path from 'node:path';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import wgsl from './src/wgsl_loader.mjs';
import html from './src/html_loader.mjs';

const entries = ['hello', 'landscape', 'sunset', 'planet'];

const projectRootDir = path.dirname(import.meta.url.replace("file://", ""));
const enginePath = path.resolve(projectRootDir, './src/engine/');
const production = !process.env.ROLLUP_WATCH;

export default entries.map(entry => ({
	input: `src/${entry}/index.ts`,
	output: {
		file: `public/${entry}.bundle.js`,
		format: 'module',
		sourcemap: !production,
	},
	watch: {
		clearScreen: false,
	},
	plugins: [
		wgsl({ stripWhitespace: production }),
		html({ stripWhitespace: production }),
		typescript({
			tsconfig: 'tsconfig.json',
			sourceMap: !production,
			inlineSources: !production,
		}),
		alias({
			entries: [
				{
					find: 'engine',
					replacement: enginePath
				}
			]
		}),
		replace({
			preventAssignment: true,
			'PRODUCTION': JSON.stringify(production),
			'DEBUG': JSON.stringify(!production),
		}),
		production && terser({
			compress: {
				drop_console: ['log', 'debug', 'info'],
				ecma: 2020,
				passes: 4
			}
		}),
	],
	onLog(level, log, handler) {
		if (log.code === 'CIRCULAR_DEPENDENCY') {
			return;
		}
		handler(level, log);
	}
}));
