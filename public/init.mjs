const bundleName = window.location.search.match(/(?:\?|\&)run=([a-zA-Z]+)/)?.[1] || 'landscape';
const { main } = await import(`./${bundleName}.bundle.js`);

async function init() {
	const el = document.querySelector('#app canvas');
	const [gfx, seed] = await main(el)

	const fps = document.querySelector('#fps span');
	const permalink = document.querySelector('#perma-link');
	permalink.setAttribute('href', '?seed=' + seed);
	permalink.innerHTML = seed;
	setInterval(() => {
		fps.innerHTML = gfx.fps.toFixed(0);
	}, 1000 / 30);

	// Form elements
	const lockMouseBtn = document.querySelector('#lock-mouse');
	const canvasPixelInp = document.querySelector('#canvas-pixel');
	const ditherSizeInp = document.querySelector('#dither-size');
	const ditherDepthInp = document.querySelector('#dither-depth');
	const fogInp = document.querySelector('#fog-level');
	const edgesChk = document.querySelector('#enable-edges');
	const modeSel = document.querySelector('#render-mode');
	function updateSettings() {
		gfx.configure({
			canvasPixelRatio: 1.0 / (parseFloat(canvasPixelInp.value) || 0.5),
			ditherSize: parseInt(ditherSizeInp.value),
			ditherDepth: parseInt(ditherDepthInp.value),
			fog: parseFloat(fogInp.value),
			drawEdges: edgesChk.checked,
			renderMode: modeSel.selectedIndex,
		});
	}

	// Update settings when they change
	const inputs = document.querySelector('#settings')?.querySelectorAll('input, select') || [];
	for (const input of inputs) {
		input.addEventListener('input', updateSettings);
		input.addEventListener('click', updateSettings);
		input.addEventListener('change', updateSettings);
	}
	updateSettings();

	lockMouseBtn.addEventListener('click', () => el.requestPointerLock());
}

await init();
