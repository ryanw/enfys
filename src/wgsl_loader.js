function wgsl(config = {}) {
	return {
		name: 'wgsl',
		transform(code, id) {
			if (id.split('.').pop() !== 'wgsl') return;
			const source = (config.stripWhitespace) ? stripWhitespace(code) : code;
			return {
				code: `export default ${JSON.stringify(source)};`,
				map: { mappings: '' }
			};
		}
	};
}

function stripWhitespace(source) {
	return source
		.replace(/\s+/gm, ' ')
		.replace(/([,:;=+-/*{}()[\]])\s/g, '$1')
		.replace(/\s([,:;=+-/*{}()[\]])/g, '$1');
}

// eslint-disable-next-line
module.exports = wgsl;
