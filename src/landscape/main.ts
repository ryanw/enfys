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
	const camera = new Camera(gfx);
	camera.translate([0, 128, -256]);
	camera.rotate(0.1, 0);
	const cameraController = new CameraController(el, camera);
	const scene = new Scene(gfx);

	const water = scene.addMesh(
		new QuadMesh(
			gfx,
			[256, 256],
			[20480, 20480],
		),
		translation(0, 0, 0),
	);

	const terrains = [];
	const chunkSize: Size = [64, 64];
	const seed = Math.random() * 0xffffffff;

	const drawDist = 8;

	for (let d = 0; d < drawDist; d++) {
		// LoD d
		for (let y = -2; y < 2; y++) {
			for (let x = -2; x < 2; x++) {
				if (d > 0 && (x >= -1 && x < 1) && (y >= -1 && y < 1)) {
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
					multiply(
						translation(chunkSize[0] * x * s, 0, chunkSize[1] * y * s),
						scaling(s, 1, s),
					),
				);
				chunk.material = new Material(gfx, hsl(d / drawDist, 0.5, 0.5));
			}
		}
	}

	gfx.run(async (dt) => {
		cameraController.update(dt);
		await gfx.draw(scene, camera);
	});

	return gfx;
}
