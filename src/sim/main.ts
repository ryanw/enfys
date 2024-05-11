import { Gfx } from 'engine';
import { Camera } from 'engine/camera';
import { Cube } from 'engine/mesh';
import Scene from 'engine/scene';

export async function main(el: HTMLCanvasElement) {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx = await Gfx.attach(el);

	const camera = new Camera();
	camera.translate([0.0, 0.0, -10.0]);
	const scene = new Scene();
	const cube = new Cube(gfx);
	const cubeId = scene.addMesh(cube);

	async function draw() {
		await gfx.draw(scene, camera);
		requestAnimationFrame(draw);
	}
	await draw();
}
