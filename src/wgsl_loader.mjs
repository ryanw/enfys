export default function wgsl(config = {}) {
	return {
		name: 'wgsl',
		transform(code, filename) {
			if (filename.split('.').pop() !== 'wgsl') return;
			let [source, imports] = transpileWgsl(code);
			if (config.stripWhitespace) {
				source = stripWhitespace(source);
			}
			const escapedCode = JSON
				.stringify(source)
				// Put whitespace back in for readability in non-minified code
				.replaceAll("\\n", "\n")
				.replaceAll("\\t", "\t")
				// Remove wrapping qutoes
				.slice(1, -1);

			// Inject all the imports
			let finalCode = Array.from(imports).map(file =>
				`import __wgslSource$${djb2(file)} from ${JSON.stringify(file)};`
			).join("\n");

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

function transpileWgsl(source) {
	const imports = new Set();
	const compiled = source.replace(/@import\s+(?:"([^"]*)"|'([^']*)')\s*;?/gm, (_match, filename) => {
		imports.add(filename);
		const sourceVariableName = "__wgslSource$" + djb2(filename);
		return "\n${" + sourceVariableName + "}\n";
	});
	return [compiled, imports];
}

function djb2(str) {
	let hash = 5381;
	const chars = str.split('').map(c => c.charCodeAt(0));
	for (const c of chars) {
		hash = ((hash << 5) + hash) + c;
	}
	return btoa(hash).replace(/=/g, '');
}
