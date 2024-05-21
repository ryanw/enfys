import { Gfx, Size } from 'engine';
import { Icosahedron, OffsetInstance, QuadMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { CameraController } from 'engine/input';
import { TerrainMesh } from './terrain_mesh';
import { Material } from 'engine/material';
import { hsl } from 'engine/color';
import { PointerController } from './pointer';
import { TreeMesh } from './tree_mesh';

function randomColor(gfx: Gfx): Material {
	return new Material(gfx, [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255]);
}

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<[Gfx, PointerController]> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seed = Math.random() * 0xffffffff;

	console.time('World Generation');
	const camera = new Camera(gfx);
	camera.translate([0, 64, 0]);
	camera.rotate(0.1, 0);
	const cameraController = new CameraController(el, camera);
	const pointerController = new PointerController(el, camera, seed);
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

	const drawDist = 5;
	const rad = 4;
	const skip = rad / 2;

	// Build terrain
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

	const trees = scene.addMesh(new TreeMesh(
		gfx,
		[0, 0, 0],
		1000.0,
		1.0,
		seed
	));
	trees.material = new Material(gfx, [50, 200, 10, 255])


	// Mouse pointer
	const pointer = scene.addMesh(new Icosahedron(gfx));
	pointer.material.color = [255, 255, 255, 255];
	pointer.material.writeDepth = false;

	gfx.run(async (dt) => {
		const t = performance.now() / 1000;
		cameraController.update(dt);
		pointer.transform = multiply(
			translation(...pointerController.worldPosition),
			rotation(t * 2, t, t * 3),
			scaling(4),
		);
		await gfx.draw(scene, camera);
	});

	return [gfx, pointerController];
}

function randRange(min: number = 0, max: number = 1): number {
	const l = Math.min(min, max);
	const r = Math.max(min, max);
	const d = r - l;

	return l + Math.random() * d;
}
