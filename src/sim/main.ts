import { Gfx } from 'engine';

export async function main(el: HTMLCanvasElement) {
	if (el.tagName !== 'CANVAS') throw new Error("Element is not a canvas")
	const gfx = await Gfx.attach(el);

	gfx.clearColor = [100, 10, 200, 255];

	async function draw() {
		await gfx.draw();
		requestAnimationFrame(draw);
	}
	await draw();
}
