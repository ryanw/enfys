import path from 'node:path';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import wgsl from './src/wgsl_loader.js';

const projectRootDir = path.dirname(import.meta.url.replace("file://", ""));
const enginePath = path.resolve(projectRootDir, './src/engine/');
const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/sim/main.ts',
	output: {
		file: 'public/bundle.js',
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
		production && terser(),
	]
}
