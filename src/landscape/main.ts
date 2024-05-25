import { Gfx, Size } from 'engine';
import { Cube, Icosahedron, QuadMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { CameraController } from 'engine/input';
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

	const spawnPosition: Point3 = [0, 0, 0];
	spawnPosition[1] = 1.0 + await queryTerrain.queryWorldPoint(spawnPosition, seed);

	const cameraPosition: Point3 = [0, 0, -20];
	cameraPosition[1] = 12.0 + spawnPosition[1];


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

	const player = scene.addMesh(new Cube(gfx), translation(...spawnPosition));
	player.material = new Material(gfx, [255, 0, 0, 255]);


	// Mouse pointer
	const pointer = scene.addMesh(new Icosahedron(gfx));
	pointer.material.writeDepth = false;

	const chunker = new Chunker(seed, 7);
	if (process.env.DEBUG) {
		//debugChunker(el.parentElement!, chunker);
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
