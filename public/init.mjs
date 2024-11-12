const bundleName = window.location.search.match(/(?:\?|\&)run=([a-zA-Z]+)/)?.[1] || 'sunset';
const { main } = await import(`./${bundleName}.bundle.js?`);
try {
	await main(document.querySelector('#app canvas'));
} catch (e) {
	window.location.replace("/gl");
}
