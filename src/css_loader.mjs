export default function css(config = {}) {
	return {
		name: 'css',
		transform(code, filename) {
			if (filename.split('.').pop() !== 'css') return null;
			let source = code;
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

			const finalCode = `export default \`${escapedCode}\`;`;

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
		.replace(/\s+/gm, ' ');
}
