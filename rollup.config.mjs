import path from 'node:path';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import wgsl from './src/wgsl_loader.mjs';

const entries = ['hello', 'demo', 'landscape'];

const projectRootDir = path.dirname(import.meta.url.replace("file://", ""));
const enginePath = path.resolve(projectRootDir, './src/engine/');
const production = !process.env.ROLLUP_WATCH;

export default entries.map(entry => ({
	input: `src/${entry}/main.ts`,
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
			'process.env.PRODUCTION': JSON.stringify(production),
			'process.env.DEBUG': JSON.stringify(!production),
		}),
		production && terser(),
	],
	onLog(level, log, handler) {
		if (log.code === 'CIRCULAR_DEPENDENCY') {
			return;
		}
		handler(level, log);
	}
}));
