import { Chunker } from './chunker';

export function debugChunker(parent: HTMLElement, chunker: Chunker) {
	const el = document.createElement('div');
	parent.appendChild(el);
	el.style.width = '1024px';
	el.style.height = '768px';
	el.style.position = 'fixed';
	el.style.top = '0px';
	el.style.left = '0px';
	el.style.zIndex = '1000';
	const color = [
		'red',
		'orange',
		'yellow',
		'green',
		'blue',
		'indigo',
		'violet',
	];
	const s = 8;
	function rebuildCells() {
		el.innerHTML = '';
		for (const chunk of chunker.activeChunks) {
			const cel = document.createElement('div');
			const scale = 1 << chunk.lod;

			cel.style.position = 'absolute';
			cel.style.left = s * chunk.position[0] + 'px';
			cel.style.top = s * chunk.position[1] + 'px';
			cel.style.width = (s * scale) + 'px';
			cel.style.height = (s * scale) + 'px';
			cel.style.border = `1px solid ${color[chunk.lod]}`;

			el.appendChild(cel);
		}
	}
	function onMouse(e: MouseEvent) {
		const x = e.clientX / s;
		const y = e.clientY / s;
		chunker.move(x, y);
		rebuildCells();
	}
	el.addEventListener('mousedown', e => {
		el.addEventListener('mousemove', onMouse);
		onMouse(e);
	});
	el.addEventListener('mouseup', e => {
		el.removeEventListener('mousemove', onMouse);
	});
	el.addEventListener('click', onMouse);
	rebuildCells();
}

