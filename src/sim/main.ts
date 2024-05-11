import { Gfx } from 'engine';
import { Tri } from 'engine/mesh';
import Scene from 'engine/scene';

export async function main(el: HTMLCanvasElement) {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx = await Gfx.attach(el);

	const scene = new Scene();
	const cube = new Tri(gfx);
	const cubeId = scene.addMesh(cube);

	async function draw() {
		await gfx.draw(scene);
		requestAnimationFrame(draw);
	}
	await draw();
}
