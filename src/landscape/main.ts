import { Gfx, Size } from 'engine';
import { Icosahedron, QuadMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { CameraController } from 'engine/input';
import { TerrainMesh } from './terrain_mesh';
import { Material } from 'engine/material';
import { hsl } from 'engine/color';

function randomColor(gfx: Gfx): Material {
	return new Material(gfx, [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255]);
}

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);

	console.time('World Generation');
	const camera = new Camera(gfx);
	camera.translate([0, 64, 0]);
	camera.rotate(0.1, 0);
	const cameraController = new CameraController(el, camera);
	const scene = new Scene(gfx);

	const water = scene.addMesh(
		new QuadMesh(
			gfx,
			[32, 32],
			[5120, 5120],
		),
		translation(0, 0, 0),
	);
	water.material = new Material(gfx, [90, 160, 250, 255]);

	const chunkSize: Size = [64, 64];
	const seed = Math.random() * 0xffffffff;

	const drawDist = 5;
	const rad = 4;
	const skip = rad / 2;

	for (let d = 0; d < drawDist; d++) {
		// LoD d
		for (let y = -rad; y < rad; y++) {
			for (let x = -rad; x < rad; x++) {
				if (d > 0 && (x >= -skip && x < skip) && (y >= -skip && y < skip)) {
					// Skip where LoD d-1 sits
					continue;
				}
				const s = 1 << d;
				const chunk = scene.addMesh(
					new TerrainMesh(
						gfx,
						chunkSize,
						[x, y, d],
						seed,
					),
					translation(chunkSize[0] * x * s, 0, chunkSize[1] * y * s),
				);
				chunk.material = new Material(gfx, hsl(d / drawDist, 0.6, 0.6));
				//chunk.material = randomColor(gfx);
			}
		}
	}
	console.timeEnd('World Generation');

	gfx.run(async (dt) => {
		cameraController.update(dt);
		await gfx.draw(scene, camera);
	});

	return gfx;
}
