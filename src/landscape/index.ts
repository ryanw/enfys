/**
 * Fly around procedurally generated alien worlds 👽🚀
 *
 * @module
 */

import { Gfx, calculateNormals } from 'engine';
import { CUBE_VERTS, ColorVertex, buildIcosahedron, Icosahedron, QuadMesh } from 'engine/mesh';
import { buildTreeMesh } from './tree_mesh';
import { Scene } from 'engine/scene';
import { multiply, scaling, translation } from 'engine/math/transform';
import { DotMaterial, SimpleMaterial } from 'engine/material';
import { Chunker } from './chunker';
import { World } from './world';
import { ShipMesh } from './ship_mesh';
import { Color, hsl } from 'engine/color';
import { randomizer } from 'engine/noise';
import { ui } from './ui';
import { add } from 'engine/math/vectors';
import { debugChunker } from './chunker.debug';
import { StarMesh } from './star_mesh';
import { DecorMesh } from './decor_mesh';

/**
 * Function that synchronises the graphics with the world state
 */
export type SyncGraphics = (world: World) => void;

/**
 * Procedurally generated alien worlds
 *
 * @param el Canvas element to draw into
 */
export async function main(el: HTMLCanvasElement) {
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seed = getSeed();

	// Add the HTML UI stuff
	ui(el.parentElement!, gfx, seed);

	// Initilise world and graphics
	const world = new World(gfx, seed);
	const [scene, sync] = buildScene(gfx, seed);

	// Start main loop
	gfx.run(async (dt) => {
		await world.update(dt);
		sync(world);
		await gfx.draw(scene, world.activeCamera.camera);
	});
}

function buildColorScheme(seed: number): Array<Color> {
	const rnd = randomizer(seed);

	const sand = rnd(0.0, 1.0);
	const grass = rnd(0.0, 1.0);
	const soil = ((grass - rnd(0.1, 0.2)) + 1) % 1;
	const rock = rnd(0.0, 1.0);
	const snow = rnd(0.0, 1.0);
	return [
		hsl(sand, rnd(0.3, 0.6), rnd(0.4, 0.6)),
		hsl(sand, rnd(0.3, 0.6), rnd(0.4, 0.6)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.5)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.5)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.6)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.6)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.6)),
		hsl(soil, rnd(0.2, 0.4), rnd(0.2, 0.5)),
		hsl(soil, rnd(0.2, 0.4), rnd(0.2, 0.4)),
		hsl(soil, rnd(0.2, 0.4), rnd(0.2, 0.4)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.6)),
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
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.8, 0.7)),
		hsl(snow, rnd(0.1, 0.2), rnd(0.7, 1.0)),
		hsl(snow, rnd(0.1, 0.2), rnd(0.8, 1.0)),
		hsl(snow, rnd(0.1, 0.2), rnd(0.9, 1.0)),
	];
}


/**
 * Build the GPU objects we'll be rendering
 */
function buildScene(gfx: Gfx, seed: number): [Scene, SyncGraphics] {
	const rnd = randomizer(seed + 12345);
	const waterColor = rnd(0.0, 1.0);

	const scene = new Scene(gfx);

	// Sky dome
	const stars = scene.addMesh(new StarMesh(
		gfx,
		[0, 0, 0],
		1000.0,
		1.0,
		seed
	));
	stars.material = new DotMaterial(gfx);

	// Add water plane
	const waterMesh = scene.addMesh(
		new QuadMesh(
			gfx,
			[32, 32],
			[51200, 51200],
		),
		translation(0, 0, 0),
	);
	waterMesh.material = new SimpleMaterial(gfx, hsl(waterColor, 0.5, 0.5));

	// Add a forest of trees
	addRocks(scene, seed, seed + 1111);
	addTrees(scene, seed, seed + 2222);

	const player = scene.addMesh(new ShipMesh(gfx));
	if (player.material instanceof SimpleMaterial) {
		player.material.receiveShadows = false;
	}
	const thruster = scene.addMesh(new Icosahedron(gfx));
	if (thruster.material instanceof SimpleMaterial) {
		thruster.material.color = [255, 200, 10, 255];
		thruster.material.receiveShadows = false;
		thruster.material.emissive = true;
	}


	const colorScheme = buildColorScheme(seed);
	const chunker = new Chunker(gfx, seed, 5, [0, 0], colorScheme);
	if (DEBUG && getParam('debug')) {
		debugChunker(gfx.canvas.parentElement!, chunker);
	}

	function syncGraphics(world: World) {
		// Update player model
		player.transform = multiply(
			translation(...world.player.position),
			world.player.rotationMatrix(),
		);

		// Enlarge flames to match thrust
		const thrust = world.playerController.thrust;
		thruster.transform = multiply(
			player.transform,
			scaling(0.3, 1.0 * thrust, 0.3),
			translation(0, -1, 0),
		);

		// Move shadow under player
		scene.shadowBuffer.moveShadow(0, world.player.position);

		// Move light to above player
		scene.lightPosition = add(world.player.position, [0, 5, 0]);

		// Sync terrain with camera view
		const [x, _, z] = world.activeCamera.camera.position;
		chunker.move(x, z);
		chunker.processQueue(scene);
	}


	return [scene, syncGraphics];
}

function getSeed(): number {
	const seedParam = getParam('seed');
	return Math.abs(seedParam ? parseInt(seedParam, 36) : Math.random() * 0x7fffffff | 0);
}

function getParam(name: string): string | undefined {
	return window.location.search.match(new RegExp(`(?:\\?|&)${name}=([^&]+)`))?.[1];
}
function addRocks(scene: Scene, terrainSeed: number, decorSeed: number) {

	const icos: Array<ColorVertex> = buildIcosahedron(p => ({
		position: [...p],
		normal: [0, 0, 0],
		color: [1.0, 1.0, 1.0, 1.0]
	}));
	calculateNormals(icos);

	const icosMesh = scene.addMesh(new DecorMesh(
		scene.gfx,
		icos,
		[0, 0, 0],
		1000.0,
		1.0 / 4.0,
		terrainSeed,
		decorSeed,
	));

	const cube: Array<ColorVertex> = CUBE_VERTS.map(p => ({
		position: [p[0] / 2, p[1] * 2 + 1.0, p[2] / 2],
		normal: [0, 0, 0],
		color: [1.0, 1.0, 1.0, 1.0]
	}));
	calculateNormals(cube);

	scene.addMesh(new DecorMesh(
		scene.gfx,
		cube,
		[0, 0, 0],
		1000.0,
		1.0 / 10.0,
		terrainSeed,
		decorSeed + 5555,
	));
}

function addTrees(scene: Scene, terrainSeed: number, decorSeed: number) {
	const vertices: Array<ColorVertex> = buildTreeMesh(p => ({
		position: [...p],
		normal: [0, 0, 0],
		color: [1.0, 1.0, 1.0, 1.0]
	}));
	calculateNormals(vertices);
	const trees = scene.addMesh(new DecorMesh(
		scene.gfx,
		vertices,
		[0, 0, 0],
		1000.0,
		1.0 / 100.0,
		terrainSeed,
		decorSeed,
	));
}

