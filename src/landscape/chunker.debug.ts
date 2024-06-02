import { Chunker } from './chunker';

export function debugChunker(parent: HTMLElement, chunker: Chunker) {
	const el = document.createElement('div');
	parent.appendChild(el);
	el.style.position = 'fixed';
	el.style.top = '0px';
	el.style.right = '0px';
	el.style.bottom = '0px';
	el.style.left = '0px';
	el.style.zIndex = '1000';
	el.style.pointerEvents = 'none';
	const color = [
		'red',
		'orange',
		'yellow',
		'green',
		'blue',
		'indigo',
		'violet',
	];
	const s = 4;
	function rebuildCells() {
		el.innerHTML = '';
		for (const chunk of chunker.activeChunks.values()) {
			const cel = document.createElement('div');
			const scale = 1 << chunk.lod;

			cel.style.position = 'absolute';
			//cel.style.background = '#000000bb';
			cel.style.boxShadow = '0px 0px 4px #fff';
			cel.style.borderRadius = '4px';
			cel.style.left = s * chunk.position[0] + 300 + 'px';
			cel.style.bottom = s * chunk.position[1] + 300 + 'px';
			cel.style.width = (s * scale) + 'px';
			cel.style.height = (s * scale) + 'px';
			cel.style.border = `1px solid ${color[chunk.lod % color.length]}`;

			el.appendChild(cel);
		}
	}
	let minLod = 0;
	function onMouse(e: MouseEvent) {
		const x = e.clientX / s;
		const y = e.clientY / s;
		chunker.move(x, y, minLod | 0);
		rebuildCells();
	}
	el.addEventListener('wheel', e => {
		minLod += e.deltaY / 120;
		minLod = Math.max(0, minLod);
		minLod = Math.min(chunker.maxLod, minLod);
		onMouse(e as MouseEvent);
	});
	el.addEventListener('mousedown', e => {
		el.addEventListener('mousemove', onMouse);
		onMouse(e);
	});
	el.addEventListener('mouseup', _e => {
		el.removeEventListener('mousemove', onMouse);
	});
	el.addEventListener('click', onMouse);

	setInterval(rebuildCells, 400);
}

