import { Gfx } from 'engine';
import { Cube, QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { TreeMesh } from './tree_mesh';
import { Chunker } from './chunker';
import { World } from './world';
import { ShipMesh } from './ship_mesh';
import { add } from 'engine/math/vectors';
import { hsl } from 'engine/color';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<[Gfx, number]> {
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seedParam = window.location.search.match(/(?:\?|\&)seed=([-0-9]+)/)?.[1];
	const seed = Math.abs(seedParam ? parseFloat(seedParam) : Math.random() * 0xffffffff | 0);
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
	const thruster = scene.addMesh(new Cube(gfx));

	const rnd = (l: number, r: number) => Math.random() * (r - l) + l;
	const sand = Math.random();
	const grass = sand + rnd(0.3, 0.7);
	const soil = grass - rnd(0.1, 0.2);
	const rock = Math.random();
	const snow = Math.random();

	const colorScheme = [
		hsl(sand, rnd(0.3, 0.6), rnd(0.4, 0.7)),
		hsl(sand, rnd(0.3, 0.6), rnd(0.3, 0.6)),
		hsl(grass, rnd(0.3, 0.6), rnd(0.3, 0.6)),
		hsl(grass, rnd(0.3, 0.6), rnd(0.3, 0.6)),
		hsl(grass, rnd(0.3, 0.6), rnd(0.2, 0.7)),
		hsl(grass, rnd(0.3, 0.6), rnd(0.2, 0.7)),
		hsl(grass, rnd(0.3, 0.6), rnd(0.2, 0.7)),
		hsl(soil, rnd(0.3, 0.6), rnd(0.2, 0.6)),
		hsl(soil, rnd(0.3, 0.6), rnd(0.2, 0.6)),
		hsl(soil, rnd(0.3, 0.6), rnd(0.2, 0.6)),
		hsl(soil, rnd(0.3, 0.6), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.2, 0.6)),
		hsl(snow, rnd(0.1, 0.2), rnd(0.6, 1.0)),
		hsl(snow, rnd(0.1, 0.2), rnd(0.6, 1.0)),
		hsl(snow, rnd(0.1, 0.2), rnd(0.6, 1.0)),
	];


	const chunker = new Chunker(gfx, seed, 5, [0, 0], colorScheme);
	function syncGraphics() {
		// Update player model
		player.transform = multiply(
			translation(...world.player.position),
			world.player.rotationMatrix(),
		);
		const thrust = world.playerController.thrust;
		thruster.transform = multiply(
			player.transform,
			translation(0, -0.5, 0),
			scaling(0.3, 1.0 * thrust, 0.3),
			translation(0, -1, 0),
		);

		scene.shadowBuffer.moveShadow(0, add(world.player.position, [0, -0.8, 0]));

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
