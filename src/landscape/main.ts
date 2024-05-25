import { Gfx, Size } from 'engine';
import { Icosahedron, QuadMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { CameraController } from 'engine/input';
import { TerrainMesh } from './terrain_mesh';
import { Material } from 'engine/material';
import { PointerController } from './pointer';
import { TreeMesh } from './tree_mesh';
import { Point3 } from 'engine/math';
import { TerrainHeightQueryPipeline } from './pipelines/terrain_height_query';
import { Chunker } from './chunker';
import { debugChunker } from './chunker.debug';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<[Gfx, PointerController]> {
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seed = Math.random() * 0xffffffff;

	// Set initial camera position just above the surface
	const queryTerrain = new TerrainHeightQueryPipeline(gfx);
	const cameraPosition: Point3 = [0, 0, 0];
	const cameraHeight = await queryTerrain.queryWorldPoint(cameraPosition, seed);
	cameraPosition[1] = 3.0 + Math.max(0, cameraHeight);

	console.time('World Generation');
	const camera = new Camera(gfx);
	camera.translate(cameraPosition);
	camera.rotate(0.1, 0);
	const cameraController = new CameraController(el, camera);
	const pointerController = new PointerController(el, camera, seed);
	const scene = new Scene(gfx);

	const water = scene.addMesh(
		new QuadMesh(
			gfx,
			[32, 32],
			[51200, 51200],
		),
		translation(0, 0, 0),
	);
	water.material = new Material(gfx, [90, 160, 250, 255]);

	scene.addMesh(new TreeMesh(
		gfx,
		[0, 0, 0],
		1000.0,
		1.0,
		seed
	), scaling(0.333));


	// Mouse pointer
	const pointer = scene.addMesh(new Icosahedron(gfx));
	pointer.material.writeDepth = false;

	const chunker = new Chunker(seed, 5);
	if (process.env.DEBUG) {
		debugChunker(el.parentElement!, chunker);
	}
	gfx.run(async (dt) => {
		const t = performance.now() / 1000;
		cameraController.update(dt);
		pointer.transform = multiply(
			translation(...pointerController.worldPosition),
			rotation(t * 2, t, t * 3),
			scaling(1),
		);
		chunker.move(camera.position[0], camera.position[2]);
		chunker.processQueue(scene),

		await gfx.draw(scene, camera);
});

return [gfx, pointerController];
}
