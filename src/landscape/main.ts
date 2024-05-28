import { Gfx } from 'engine';
import { QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { TreeMesh } from './tree_mesh';
import { Chunker } from './chunker';
import { World } from './world';
import { ShipMesh } from './ship_mesh';
import { add } from 'engine/math/vectors';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<[Gfx, number]> {
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seedParam = window.location.search.match(/(?:\?|\&)seed=([-0-9]+)/)?.[1];
	const seed = Math.abs(seedParam ? parseFloat(seedParam) : Math.random() * 0xffffffff | 0);
	console.log("SEED?", seed);
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

	const player = scene.addMesh(new ShipMesh(gfx), translation(...world.player.position));



	const chunker = new Chunker(seed, 5);
	function syncGraphics() {
		// Update player model
		player.transform = multiply(
			translation(...world.player.position),
			world.player.rotationMatrix(),
		);

		scene.shadowBuffer.moveShadow(0, add(world.player.position, [0, -0.5, 0]));

		// Sync terrain with camera view
		const [x, _, z] = world.activeCamera.camera.position;
		chunker.move(x, z);
		chunker.processQueue(scene);
	}

	gfx.run(async (dt) => {

		await world.update(dt);
		syncGraphics();

		await gfx.draw(scene, world.activeCamera.camera);
	});

	return [gfx, seed];
}
