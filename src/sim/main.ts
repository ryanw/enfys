import { Gfx } from 'engine';

export function main(elOrSelector: HTMLElement | string) {
	const el = typeof elOrSelector === 'string' 
		? document.querySelector(elOrSelector) as HTMLElement
		: elOrSelector;
	if (!el) throw new Error(`Couldn't find HTML Element: ${elOrSelector}`);
	const gfx = new Gfx(el);
	console.log('GDX', gfx);
}
