import { Gfx } from 'engine';
import html from './ui.html';


export function ui(wrapper: HTMLElement, gfx: Gfx, seed: number) {
	const el = document.createElement('div');
	el.innerHTML = html;

	const fps = el.querySelector('#fps span')!;
	const permalink = el.querySelector('#perma-link')!;
	permalink.setAttribute('href', '?seed=' + seed);
	permalink.innerHTML = seed.toString();
	setInterval(() => {
		fps.innerHTML = gfx.fps.toFixed(0);
	}, 1000 / 30);

	const form = el.querySelector('form')!;
	form.addEventListener('input', (e: Event) => {
		const data = new FormData(form);
	});


	const lockMouseBtn = el.querySelector('#lock-mouse') as HTMLButtonElement;
	const canvasPixelInp = el.querySelector('#canvas-pixel') as HTMLInputElement;
	const ditherSizeInp = el.querySelector('#dither-size') as HTMLInputElement;
	const ditherDepthInp = el.querySelector('#dither-depth') as HTMLInputElement;
	const fogInp = el.querySelector('#fog-level') as HTMLInputElement;
	const edgesChk = el.querySelector('#enable-edges') as HTMLInputElement;
	const modeSel = el.querySelector('#render-mode') as HTMLSelectElement;
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
	const inputs = el.querySelector('#settings')?.querySelectorAll('input, select') || [];
	for (const input of inputs) {
		input.addEventListener('input', updateSettings);
		input.addEventListener('click', updateSettings);
		input.addEventListener('change', updateSettings);
	}
	updateSettings();

	lockMouseBtn.addEventListener('click', () => el.requestPointerLock());

	wrapper.appendChild(el);
}
