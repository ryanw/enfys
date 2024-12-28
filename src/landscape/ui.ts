import { Gfx } from 'engine';
import html from './ui.html';
import { Sound } from 'engine/sound';


/**
 * Construct the HTML user interface and insert it into the DOM
 *
 * @param wrapper Element to insert the UI into
 * @param gfx Graphics context
 * @param seed World seed
 *
 */
export function ui(wrapper: HTMLElement, gfx: Gfx, sound: Sound, seed: number) {
	const el = document.createElement('div');
	el.innerHTML = html;

	let showSettings = false;
	const fps = el.querySelector('#fps span')!;
	const permalink = el.querySelector('#perma-link')!;
	const settings: HTMLElement = el.querySelector('#settings')!;
	const panel: HTMLElement = el.querySelector('#settings-panel')!;
	panel.classList.add('open');
	setTimeout(() => panel.classList.remove('open'), 3000);

	settings.style.display = showSettings ? 'block' : 'none';

	permalink.setAttribute('href', '?seed=' + seed.toString(36));
	permalink.innerHTML = seed.toString(36);
	setInterval(() => {
		if (showSettings) {
			fps.innerHTML = `${gfx.fps.toFixed(0)} (${gfx.uncappedFps.toFixed(0)})`;
		}
	}, 1000 / 10);

	function toggleSettings() {
		showSettings = !showSettings;
		settings.style.display = showSettings ? 'block' : 'none';
	}

	const form = el.querySelector('form')!;
	form.addEventListener('input', (e: Event) => {
		const data = new FormData(form);
	});

	const toggleButton = el.querySelector('#toggle-settings') as HTMLButtonElement;
	toggleButton.addEventListener('click', toggleSettings);

	const canvasPixelInp = el.querySelector('#canvas-pixel') as HTMLInputElement;
	const ditherSizeInp = el.querySelector('#dither-size') as HTMLInputElement;
	const ditherDepthInp = el.querySelector('#dither-depth') as HTMLInputElement;
	const fogInp = el.querySelector('#fog-level') as HTMLInputElement;
	const edgesChk = el.querySelector('#enable-edges') as HTMLInputElement;
	const soundChk = el.querySelector('#enable-sound') as HTMLInputElement;
	const modeSel = el.querySelector('#render-mode') as HTMLSelectElement;
	function updateSettings() {
		sound.mute(!soundChk.checked);
		gfx.configure({
			canvasPixelRatio: 1.0 / (parseFloat(canvasPixelInp.value) || 0.5),
			ditherSize: parseInt(ditherSizeInp.value),
			ditherDepth: parseInt(ditherDepthInp.value),
			fog: parseFloat(fogInp.value),
			drawEdges: edgesChk.checked ? 2 : 0,
			renderMode: modeSel.selectedIndex,
		});
	}

	// Update settings when they change
	const inputs = el.querySelectorAll('input, select') || [];
	for (const input of inputs) {
		input.addEventListener('input', updateSettings);
		input.addEventListener('click', updateSettings);
		input.addEventListener('change', updateSettings);
	}
	updateSettings();

	wrapper.appendChild(el);
}
