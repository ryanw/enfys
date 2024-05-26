import { Gfx } from 'engine';
import { Cube, QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { scaling, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { TreeMesh } from './tree_mesh';
import { Chunker } from './chunker';
import { World } from './world';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seed = Math.random() * 0xffffffff;
	const world = new World(gfx, el, seed);


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

	const player = scene.addMesh(new Cube(gfx, 0.2), translation(...world.player.position));
	player.material = new Material(gfx, [255, 0, 0, 255]);


	const chunker = new Chunker(seed, 7);
	function syncGraphics() {
		// Update player model
		player.transform = translation(...world.player.position);

		// Sync terrain with camera view
		const [x, _, z] = world.activeCamera.camera.position;
		chunker.move(x, z);
		chunker.processQueue(scene);
	}

	gfx.run(async (dt) => {
		syncGraphics();

		await Promise.all([
			world.update(dt),
			gfx.draw(scene, world.activeCamera.camera),
		]);
	});

	return gfx;
}
