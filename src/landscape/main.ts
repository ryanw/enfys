import { Gfx } from 'engine';
import { Icosahedron, QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { multiply, scaling, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { TreeMesh } from './tree_mesh';
import { Chunker } from './chunker';
import { World } from './world';
import { ShipMesh } from './ship_mesh';
import { add } from 'engine/math/vectors';
import { hsl } from 'engine/color';
import { ui } from '../ui';
import { pcg3d } from 'engine/noise';


/**
 * Procedurally generated alien worlds
 */
export async function main(el: HTMLCanvasElement): Promise<[Gfx, number]> {
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seedParam = window.location.search.match(/(?:\?|&)seed=([-0-9]+)/)?.[1];
	const seed = Math.abs(seedParam ? parseFloat(seedParam) : Math.random() * 0x7fffffff | 0);
	const world = new World(gfx, el, seed);
	let rndIdx = 100;
	const rnd = (l: number, r: number, t: number = 321) => pcg3d([t * 10, seed/10000, rndIdx++ * 10])[0] * (r - l) + l;

	ui(el.parentElement!, gfx, seed);

	const water = rnd(0.0, 1.0);
	const sand  = rnd(0.0, 1.0);
	const grass = rnd(0.0, 1.0);
	const soil  = ((grass - rnd(0.1, 0.2)) + 1) % 1;
	const rock  = rnd(0.0, 1.0);
	const snow  = rnd(0.0, 1.0);

	const scene = new Scene(gfx);

	const waterMesh = scene.addMesh(
		new QuadMesh(
			gfx,
			[32, 32],
			[51200, 51200],
		),
		translation(0, 0, 0),
	);
	waterMesh.material = new Material(gfx, hsl(water, 0.5, 0.5));

	// FIXME maybe should be in World?
	scene.addMesh(new TreeMesh(
		gfx,
		[0, 0, 0],
		1000.0,
		1.0,
		seed
	), scaling(0.333));

	const player = scene.addMesh(new ShipMesh(gfx), translation(...world.player.position));
	const thruster = scene.addMesh(new Icosahedron(gfx));
	// FIXME don't set this directly
	
	thruster.material.color = [255, 200, 10, 255];
	thruster.material.uniform.set('emissive', true);



	const colorScheme = [
		hsl(sand, rnd(0.3, 0.6), rnd(0.4, 0.7)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.5)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.5)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.6)),
		hsl(soil, rnd(0.2, 0.4), rnd(0.2, 0.5)),
		hsl(soil, rnd(0.2, 0.4), rnd(0.2, 0.5)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
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
			translation(0, 0, 0),
			scaling(0.3, 1.0 * thrust, 0.3),
			translation(0, -1, 0),
		);

		scene.shadowBuffer.moveShadow(0, add(world.player.position, [0, -0.0, 0]));

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
