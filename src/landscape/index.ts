/**
 * Fly around procedurally generated alien worlds 👽🚀
 *
 * @module
 */

import { Gfx, calculateNormals } from 'engine';
import { CUBE_VERTS, ColorVertex, buildIcosahedron, Icosahedron, QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { multiply, multiplyVector, rotation, scaling, transformPoint, translation } from 'engine/math/transform';
import { DotMaterial, SimpleMaterial } from 'engine/material';
import { Chunker } from './chunker';
import { World } from './world';
import { ShipMesh } from './ship_mesh';
import { Color, colorToInt, hsl } from 'engine/color';
import { randomizer } from 'engine/noise';
import { ui } from './ui';
import { add, normalize, scale } from 'engine/math/vectors';
import { debugChunker } from './chunker.debug';
import { StarMesh } from './star_mesh';
import { BuildingMesh, DecorMesh } from './decor_mesh';
import { Point3, Vector3 } from 'engine/math';
import { Particles } from 'engine/particles';
import { Entity } from 'engine/entity';
import { TreeDecorMesh } from './meshes/tree';

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
	if (DEBUG) {
		gfx.framecap = 60;
	}
	const seed = getSeed();

	// Add the HTML UI stuff
	ui(el.parentElement!, gfx, seed);

	// Initilise world and graphics
	const world = new World(gfx, seed);
	const [scene, sync] = buildScene(gfx, seed);

	world.run();

	// Start main loop
	gfx.run(async (dt) => {
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
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.5)),
		hsl(grass, rnd(0.4, 0.6), rnd(0.4, 0.5)),
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
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.4, 0.7)),
		hsl(rock, rnd(0.2, 0.3), rnd(0.8, 0.7)),
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
	waterMesh.material = new SimpleMaterial(gfx, colorToInt(hsl(waterColor, 0.5, 0.5, 0.9)));

	// Add a forest of trees
	const decors = [
		addRocks(scene, 16.0, seed, seed + 1111),
		addRocks(scene, 32.0, seed, seed + 1112),
		addTrees(scene, 48.0, seed, seed + 2222),
		addTrees(scene, 96.0, seed, seed + 2223),
		addCubes(scene, 16.0, seed, seed + 3333),
		addCubes(scene, 32.0, seed, seed + 3334),
		addTufts(scene, 8.0, seed, seed + 4444),
		addBuildings(scene, 256.0, seed, seed + 6666),
	];

	const player = scene.addMesh(new ShipMesh(gfx));
	if (player.material instanceof SimpleMaterial) {
		player.material.receiveShadows = false;
	}

	const flameParticle: Array<ColorVertex> = CROSS_CUBE.map(position => ({
		position: [position[0] / 32.0, position[1] / 32.0, position[2] / 32.0],
		normal: [0, 0, 0],
		color: BigInt(0xffffffff),
	}));
	calculateNormals(flameParticle);
	const particles = scene.addMesh(new Particles(gfx, flameParticle, 256));
	if (particles.material instanceof SimpleMaterial) {
		particles.material.receiveShadows = false;
		particles.material.emissive = true;
	}

	const colorScheme = buildColorScheme(seed);
	const chunker = new Chunker(gfx, seed, 6, colorScheme);
	if (DEBUG && getParam('debug')) {
		debugChunker(gfx.canvas.parentElement!, chunker);
	}

	function syncGraphics(world: World) {
		// Enlarge flames to match thrust
		const thrust = world.playerController.thrust;

		const rot = world.player.rotationMatrix();
		particles.object.origin = world.player.position;//add(world.player.position, multiplyVector(rot, [0, -0.3, 0, 0]).slice(0, 2) as Vector3);
		particles.object.direction = multiplyVector(rot, [0, -1, 0, 0]).slice(0, 3) as Vector3;
		particles.object.update(performance.now() / 1000.0);
		particles.object.count = 256 * Math.pow(thrust, 4.0);

		// Update player model
		player.transform = multiply(
			translation(...world.player.position),
			world.player.rotationMatrix(),
		);

		// Move shadow under player
		scene.shadowBuffer.moveShadow(0, world.player.position);

		// Move light to above player
		scene.lightPosition = add(world.player.position, [0, 5, 0]);

		// Sync terrain with camera view
		const [cx, _cy, cz] = world.activeCamera.camera.position;
		const [px, _py, pz] = world.player.position;

		chunker.move(px, pz);
		chunker.processQueue(scene);

		for (const dec of decors) {
			dec.object.move(cx, cz);
		}
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

function addCubes(scene: Scene, spread: number, terrainSeed: number, decorSeed: number): Entity<DecorMesh> {
	const cube: Array<ColorVertex> = CUBE_VERTS.map(p => ({
		position: [p[0] / 3, p[1] / 3 + 0.3, p[2] / 3],
		normal: [0, 0, 0],
		color: BigInt(0xffffffff),
	}));

	const radius = 2;
	const entity = scene.addMesh(new DecorMesh(
		scene.gfx,
		cube,
		[0, 0],
		4.0,
		spread,
		terrainSeed,
		decorSeed + 5555,
		radius,
	));

	if (entity.material instanceof SimpleMaterial) {
		entity.material.fadeout = 8 * radius * spread;
	}

	return entity;
}

function addBuildings(scene: Scene, spread: number, terrainSeed: number, decorSeed: number): Entity<DecorMesh> {
	const cube: Array<ColorVertex> = CUBE_VERTS.map(p => ({
		position: [p[0] * 32, p[1] * 32, p[2] * 32],
		normal: [0, 0, 0],
		color: BigInt(0xffffffff),
	}));
	calculateNormals(cube);

	const radius = 8;
	const entity = scene.addMesh(new BuildingMesh(
		scene.gfx,
		cube,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed + 5555,
		radius,
	));

	if (entity.material instanceof SimpleMaterial) {
		entity.material.fadeout = 8 * radius * spread;
	}

	return entity;
}

function addTufts(scene: Scene, spread: number, terrainSeed: number, decorSeed: number): Entity<DecorMesh> {
	const rnd = randomizer(decorSeed + 531);
	const bt = 32;
	const brad = 1.5;
	const count = 10;
	const baseBlade: Array<ColorVertex> = CUBE_VERTS.map(p => ({
		position: [p[0] / bt, p[1], p[2] / bt],
		normal: [0, 0, 0],
		color: BigInt(0xff99dd66),
	}));
	calculateNormals(baseBlade);

	let vertices: Array<ColorVertex> = [];
	for (let i = 0; i < count; i++) {
		const x = rnd(-brad, brad);
		const y = rnd(-2, -0.5);
		const z = rnd(-brad, brad);
		const blade = baseBlade.map(vertex => {
			const p = [...vertex.position];
			const position = [p[0] + x, p[1] + y, p[2] + z];
			return {
				...vertex,
				position
			} as ColorVertex;
		});
		vertices = [...vertices, ...blade];
	}

	const radius = 3;
	const entity = scene.addMesh(new DecorMesh(
		scene.gfx,
		vertices,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed + 123412,
		radius
	));

	if (entity.material instanceof SimpleMaterial) {
		entity.material.fadeout = 8 * radius * spread;
	}

	return entity;
}

function addRocks(scene: Scene, spread: number, terrainSeed: number, decorSeed: number): Entity<DecorMesh> {
	const icos: Array<ColorVertex> = buildIcosahedron(p => ({
		position: [...p],
		normal: [0, 0, 0],
		color: BigInt(0xff445566),
	}));
	calculateNormals(icos);

	const radius = 2;
	const entity = scene.addMesh(new DecorMesh(
		scene.gfx,
		icos,
		[0, 0],
		4.0,
		spread,
		terrainSeed,
		decorSeed + 5555,
		radius
	));

	if (entity.material instanceof SimpleMaterial) {
		entity.material.fadeout = 8 * radius * spread;
	}

	return entity;
}

function addTrees(scene: Scene, spread: number, terrainSeed: number, decorSeed: number): Entity<DecorMesh> {
	const trunk = CUBE_VERTS.map(p => {
		const position = [p[0] / 2.0, p[1] * 8.0, p[2] / 2.0];
		return {
			position,
			normal: [0, 0, 0],
			color: BigInt(0xff005599),
		} as ColorVertex;
	});

	function buildBush(size: number, offset: Vector3): Array<ColorVertex> {
		const rot = rotation(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
		return buildIcosahedron(p => {
			const q = transformPoint(rot, p);;
			const position = [
				offset[0] + q[0] * size,
				offset[1] + q[1] * size + 7.0,
				offset[2] + q[2] * size,
			];

			return {
				position,
				normal: [0, 0, 0],
				color: BigInt(0xff00aa00),
			} as ColorVertex;
		})
	}

	function rndPoint(radius: number): Point3 {
		return scale(normalize([
			(Math.random() * 2.0 - 1.0),
			(Math.random() * 2.0 - 1.0),
			(Math.random() * 2.0 - 1.0),
		] as Point3), Math.random() * radius);
	}

	let vertices = trunk;
	for (let i = 0; i < 9; i++) {
		const p = rndPoint(3);
		vertices = [...vertices, ...buildBush(1.0 + 2 * Math.random(), p)];
	}

	calculateNormals(vertices);

	const radius = 3;
	const entity = scene.addMesh(new TreeDecorMesh(
		scene.gfx,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed,
		radius,
	));

	if (entity.material instanceof SimpleMaterial) {
		entity.material.fadeout = 8 * radius * spread;
	}

	return entity;
}


const CROSS_CUBE: Array<Point3> = [
	[-1, -1, 0],
	[1, -1, 0],
	[1, 1, 0],

	[-1, -1, 0],
	[1, 1, 0],
	[-1, 1, 0],

	[0, -1, 1],
	[0, -1, -1],
	[0, 1, -1],

	[0, -1, 1],
	[0, 1, -1],
	[0, 1, 1],

	[1, -1, 0],
	[-1, -1, 0],
	[-1, 1, 0],

	[1, -1, 0],
	[-1, 1, 0],
	[1, 1, 0],

	[0, -1, -1],
	[0, -1, 1],
	[0, 1, 1],

	[0, -1, -1],
	[0, 1, 1],
	[0, 1, -1],

	[-1, 0, 1],
	[1, 0, 1],
	[1, 0, -1],

	[-1, 0, 1],
	[1, 0, -1],
	[-1, 0, -1],

	[1, 0, 1],
	[-1, 0, -1],
	[1, 0, -1],

	[1, 0, 1],
	[-1, 0, 1],
	[-1, 0, -1]
];
