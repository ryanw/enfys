/**
 * A very simple demo
 *
 * @module
 */

import { Gfx } from 'engine';
import { Icosahedron } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { multiply, rotation, translation } from 'engine/math/transform';
import { FreeCameraController } from 'engine/input/free_camera';
import { SimpleMaterial } from 'engine/material';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	const camera = new Camera(gfx);
	const cameraController = new FreeCameraController(el, camera);
	const scene = new Scene(gfx);

	const icos = Array.from({ length: 100 }, () => {
		const x = (Math.random() - 0.5) * 100.0;
		const y = (Math.random() - 0.5) * 100.0;
		const z = Math.random() * 100.0;
		return scene.addMesh(new Icosahedron(gfx), new SimpleMaterial(gfx, 0xff0000ff), translation(x, y, z));
	});

	function update(dt: number) {
		for (const ico of icos) {
			ico.transform = multiply(ico.transform, rotation(0, 1 * dt, 0));
		}
	}

	gfx.run(async (dt) => {
		cameraController.update(dt);
		update(dt);
		await gfx.draw(scene, camera);
	});

	return gfx;
}
