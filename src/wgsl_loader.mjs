import path from 'path';

export default function wgsl(config = {}) {
	return {
		name: 'wgsl',
		transform(code, filename) {
			if (filename.split('.').pop() !== 'wgsl') return;
			let [source, imports] = transpileWgsl(filename, code);
			if (config.stripWhitespace) {
				source = stripWhitespace(source);
			}
			const escapedCode = JSON
				.stringify(source)
				// Put whitespace back in for readability in non-minified code
				.replaceAll('\\n', '\n')
				.replaceAll('\\t', '\t')
				// Remove wrapping qutoes
				.slice(1, -1);

			// Inject all the imports
			let finalCode = `// File: ${filename}\n` + Array.from(imports).map(file =>
				`// Import: ${file}\nimport __wgslSource$${djb2(file)} from ${JSON.stringify(file)};`
			).join('\n');

			// Append the actual code
			finalCode += `export default \`${escapedCode}\`;`;

			return {
				code: finalCode,
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

function transpileWgsl(sourceFilename, source) {
	const imports = new Set();
	const dirname = path.dirname(sourceFilename);
	const compiled = source.replace(/@import\s+(?:"([^"]*)"|'([^']*)')\s*;?/gm, (_match, filename) => {
		const fullName = filename[0] === '.' ? path.normalize(path.join(dirname, filename)) : filename;
		imports.add(fullName);
		const hash = hashFilename(fullName);
		const sourceVariableName = '__wgslSource$' + hash;
		return `// Import: ${fullName}\n` + '${' + sourceVariableName + '}\n';
	});
	return [compiled, imports];
}

function hashFilename(filename) {
	return djb2(filename);
}

function djb2(str) {
	let hash = 5381;
	const chars = str.split('').map(c => c.charCodeAt(0));
	for (const c of chars) {
		hash = ((hash << 5) + hash) + c;
	}
	return btoa(hash).replace(/=/g, '');
}
