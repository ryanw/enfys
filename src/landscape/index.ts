/**
 * Fly around procedurally generated alien worlds 👽🚀
 *
 * @module
 */

import { Gfx, calculateNormals } from 'engine';
import { CUBE_VERTS, ColorVertex, buildIcosahedron, QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { multiply, multiplyVector, scaling, translation } from 'engine/math/transform';
import { DotMaterial, SimpleMaterial } from 'engine/material';
import { Chunker } from './chunker';
import { OldWorld as OldWorld } from './world';
import { ShipMesh } from './ship_mesh';
import { colorToInt, hsl } from 'engine/color';
import { randomizer } from 'engine/noise';
import { ui } from './ui';
import { debugChunker } from './chunker.debug';
import { StarMesh } from './star_mesh';
import { BuildingMesh, DecorMesh } from './decor_mesh';
import { Point3, Vector3 } from 'engine/math';
import { Particles } from 'engine/particles';
import { Pawn } from 'engine/pawn';
import { TreeDecorMesh } from './meshes/tree';
import { getParam } from './helpers';
import { ShipMode } from './player';
import { ColorScheme } from './color_scheme';
import { freeCamPrefab, orbitCamPrefab, playerPrefab } from './prefabs';
import { WorldGraphics } from 'engine/world_graphics';
import { World } from 'engine/ecs/world';
import { FreeCameraInputSystem } from 'engine/ecs/systems/free_camera_input';
import { OrbitCameraInputSystem } from 'engine/ecs/systems/orbit_camera_input';
import { VelocityComponent } from 'engine/ecs/components';

/**
 * Function that synchronises the graphics with the world state
 */
export type SyncGraphics = (world: OldWorld) => void;

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
	const oldWorld = new OldWorld(gfx, seed);
	//world.cameras[0].camera.far = 400.0;
	//const [scene, sync] = oldBuildScene(gfx, seed);
	//oldWorld.run();
	
	// Graphics objects
	const scene = new Scene(gfx);

	// Sync graphics with world
	const graphics = new WorldGraphics();
	graphics.insertResource('player-ship', new ShipMesh(gfx));

	// World simulation
	const world = new World();
	world.addSystem(new FreeCameraInputSystem(el));
	world.addSystem(new OrbitCameraInputSystem(el));

	const player0 = playerPrefab(world);
	const player1 = playerPrefab(world);
	const player2 = playerPrefab(world);
	world.addComponent(player0, new VelocityComponent([0, -0.2, 0]));

	const freeCam = freeCamPrefab(world);
	const orbitCam = orbitCamPrefab(world, player0);

	world.run();

	// FIXME set default camera to orbit camera
	scene.currentCameraId = 2;
	// Start main loop
	gfx.run(async (dt) => {
		graphics.update(world, scene);
		await gfx.draw(scene, scene.activeCamera);
	});
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

	// Add lots of bits and bobs all over the place
	const decors = [
		addRocks(scene, 12.0, 3, seed, seed + 1111),
		addRocks(scene, 24.0, 4, seed, seed + 1112),
		addTrees(scene, 48.0, 4, seed, seed + 2222),
		addTrees(scene, 96.0, 4, seed, seed + 2223),
		addCubes(scene, 12.0, 3, seed, seed + 3333),
		addCubes(scene, 24.0, 5, seed, seed + 3334),
		addTufts(scene, 6.0, 6, seed, seed + 4444),
		addBuildings(scene, 256.0, 8, seed, seed + 6666),
	];

	const player = scene.addMesh(new ShipMesh(gfx));

	const flameParticle: Array<ColorVertex> = CROSS_CUBE.map(position => ({
		position: [position[0] / 12.0, position[1] / 12.0, position[2] / 12.0],
		normal: [0, 0, 0],
		color: BigInt(0xffffffff),
	}));
	calculateNormals(flameParticle);
	const particles = scene.addMesh(new Particles(gfx, flameParticle, 256));
	if (particles.material instanceof SimpleMaterial) {
		particles.material.emissive = true;
	}

	const colorScheme = new ColorScheme(seed);
	const chunker = new Chunker(gfx, seed, 6, colorScheme);
	if (DEBUG && getParam('debug') == '1') {
		debugChunker(gfx.canvas.parentElement!, chunker);
	}

	function syncGraphics(world: OldWorld) {
		scene.light.updateForCamera(world.shipCamera.camera);

		// Enlarge flames to match thrust
		const thrust = world.playerController.thrust;

		const rot = world.player.rotationMatrix();
		particles.object.origin = world.player.position;
		particles.object.direction = multiplyVector(rot, [0, -1, 0, 0]).slice(0, 3) as Vector3;
		particles.object.update(performance.now() / 1000.0);
		particles.object.count = 256 * thrust;

		// Update player model
		player.transform = multiply(
			translation(...world.player.position),
			world.player.rotationMatrix(),
			world.player.mode == ShipMode.Land ? scaling(0.5, 1.2, 1) : scaling(1, 1, 1),
		);

		// Sync terrain with camera view
		const [cx, _cy, cz] = world.shipCamera.camera.position;
		const [px, _py, pz] = world.player.position;

		chunker.move(px, pz);
		chunker.processQueue(scene);

		const clippingPlanes = world.shipCamera.camera.clippingPlanes();
		scene.frustumClip(clippingPlanes);
		for (const dec of decors) {
			dec.object.clippingPlanes = clippingPlanes;
			dec.object.move(cx, cz);
		}
	}

	return [scene, syncGraphics];
}

function getSeed(): number {
	const seedParam = getParam('seed');
	return Math.abs(seedParam ? parseInt(seedParam, 36) : Math.random() * 0x7fffffff | 0);
}

function addCubes(scene: Scene, spread: number, radius: number, terrainSeed: number, decorSeed: number): Pawn<DecorMesh> {
	const cube: Array<ColorVertex> = CUBE_VERTS.map(p => ({
		position: [p[0] / 3, p[1] / 3 + 0.3, p[2] / 3],
		normal: [0, 0, 0],
		color: BigInt(0xffffffff),
	}));

	const pawn = scene.addMesh(new DecorMesh(
		scene.gfx,
		cube,
		[0, 0],
		4.0,
		spread,
		terrainSeed,
		decorSeed + 5555,
		radius,
	));

	if (pawn.material instanceof SimpleMaterial) {
		pawn.material.fadeout = 8 * radius * spread;
	}

	return pawn;
}

function addBuildings(scene: Scene, spread: number, radius: number, terrainSeed: number, decorSeed: number): Pawn<DecorMesh> {
	const cube: Array<ColorVertex> = CUBE_VERTS.map(p => ({
		position: [p[0] * 32, p[1] * 320, p[2] * 32],
		normal: [0, 0, 0],
		color: BigInt(0xffffffff),
	}));
	calculateNormals(cube);

	const pawn = scene.addMesh(new BuildingMesh(
		scene.gfx,
		cube,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed + 5555,
		radius,
	));

	if (pawn.material instanceof SimpleMaterial) {
		pawn.material.fadeout = 8 * radius * spread;
	}

	return pawn;
}

function addTufts(scene: Scene, spread: number, radius: number, terrainSeed: number, decorSeed: number): Pawn<DecorMesh> {
	const rnd = randomizer(decorSeed + 531);
	const bt = 16;
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

	const pawn = scene.addMesh(new DecorMesh(
		scene.gfx,
		vertices,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed + 123412,
		radius
	));

	if (pawn.material instanceof SimpleMaterial) {
		pawn.material.fadeout = 8 * radius * spread;
	}

	return pawn;
}

function addRocks(scene: Scene, spread: number, radius: number, terrainSeed: number, decorSeed: number): Pawn<DecorMesh> {
	const icos: Array<ColorVertex> = buildIcosahedron(p => ({
		position: [...p],
		normal: [0, 0, 0],
		color: BigInt(0xff445566),
	}));
	calculateNormals(icos);

	const pawn = scene.addMesh(new DecorMesh(
		scene.gfx,
		icos,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed + 5555,
		radius
	));

	if (pawn.material instanceof SimpleMaterial) {
		pawn.material.fadeout = 8 * radius * spread;
	}

	return pawn;
}

function addTrees(scene: Scene, spread: number, radius: number, terrainSeed: number, decorSeed: number): Pawn<DecorMesh> {
	const pawn = scene.addMesh(new TreeDecorMesh(
		scene.gfx,
		[0, 0],
		1.0,
		spread,
		terrainSeed,
		decorSeed,
		radius,
	));

	if (pawn.material instanceof SimpleMaterial) {
		pawn.material.fadeout = 8 * radius * spread;
	}

	return pawn;
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
