import path from 'node:path';
import fs from 'node:fs';

export default function wgsl(config = {}) {
	return {
		name: 'wgsl',
		transform(code, filename) {
			if (filename.split('.').pop() !== 'wgsl') return;

			const fullpath = path.resolve(process.cwd(), filename);
			let source = transpileWgsl(fullpath, code);

			if (config.stripWhitespace) {
				source = stripWhitespace(source);
			}
			return {
				code: `export default ${JSON.stringify(source)};`,
				map: { mappings: '' }
			};
		}
	};
}

function stripWhitespace(source) {
	return source
		// Remove comments
		.replace(/\/\/.*/g, '')
		// Collapse whitespace
		.replace(/\s+/gm, ' ')
		// Remove unneeded whitespce
		.replace(/([,:;=+-/*{}()[\]])\s/g, '$1')
		.replace(/\s([,:;=+-/*{}()[\]])/g, '$1');
}

function transpileWgsl(fullpath, source, imports = new Set()) {
	const dirname = path.dirname(fullpath);
	imports.add(fullpath);
	return source.replace(/@import\s+(?:"([^"]*)"|'([^']*)')\s*;?/gm, (_match, filename) => {
		let importpath = filename;
		// Starts with ./ or ../
		if (filename.indexOf(/^\.\.?\//).indexOf === 0) {
			importpath = path.resolve(dirname, filename);
		}
		else {
			importpath = path.resolve('./src/', filename);
		}
		const data = fs.readFileSync(importpath, 'utf8');
		return transpileWgsl(importpath, data, imports) + '\n';
	});
}
