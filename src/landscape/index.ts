/**
 * Fly around procedurally generated alien worlds 👽🚀
 *
 * @module
 */

import { Gfx } from 'engine';
import { Cube } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { DotMaterial } from 'engine/material';
import { ShipMesh } from './ship_mesh';
import { ui } from './ui';
import { StarMesh } from './star_mesh';
import { getParam } from './helpers';
import { decorPrefab, freeCamPrefab, lightPrefab, orbitCamPrefab, playerPrefab, terrainPrefab, waterPrefab } from './prefabs';
import { WorldGraphics } from 'engine/world_graphics';
import { World } from 'engine/ecs/world';
import { FreeCameraInputSystem } from 'engine/ecs/systems/free_camera_input';
import { OrbitCameraInputSystem } from 'engine/ecs/systems/orbit_camera_input';
import { TerrainSystem } from './systems/terrain';
import { PlayerInputSystem } from './systems/player_input';
import { PhysicsSystem } from 'engine/ecs/systems/physics';
import { RockMesh } from './meshes/rock';
import { TreeMesh } from './meshes/tree';
import { TransformComponent, VelocityComponent } from 'engine/ecs/components';
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

	// Graphics objects
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


	// Sync graphics with world
	const graphics = new WorldGraphics(gfx);
	graphics.insertResource('player-ship', new ShipMesh(gfx));
	graphics.insertResource('decor-rocks', new RockMesh(gfx));
	graphics.insertResource('decor-trees', new TreeMesh(gfx, seed));
	graphics.insertResource('decor-cubes', new Cube(gfx, 0.2));
	graphics.insertResource('decor-tufts', new Cube(gfx, 0.2));

	// World simulation
	const world = new World();
	world.addSystem(new PhysicsSystem(gfx));
	world.addSystem(new PlayerInputSystem(el));
	world.addSystem(new FreeCameraInputSystem(el));
	world.addSystem(new OrbitCameraInputSystem(el));
	world.addSystem(new TerrainSystem(gfx));
	console.log("GO!", world, graphics);

	const light = lightPrefab(world, [0.7, 1.0, 0.0]);
	setInterval(() => {
		const tra = world.getComponent(light, TransformComponent)!;
		tra.rotation[1] += 0.0001;

	}, 1000 / 60);

	const player = playerPrefab(world, [0, 3, 7]);
	const freeCam = freeCamPrefab(world);
	const orbitCam = orbitCamPrefab(world, player);
	const water = waterPrefab(world);
	const cubes0 = decorPrefab(world, 'decor-cubes', seed, 12, 3, orbitCam);
	const cubes1 = decorPrefab(world, 'decor-cubes', seed, 24, 5, orbitCam);
	const rocks0 = decorPrefab(world, 'decor-rocks', seed, 12, 3, orbitCam);
	const rocks1 = decorPrefab(world, 'decor-rocks', seed, 24, 4, orbitCam);
	const trees0 = decorPrefab(world, 'decor-trees', seed, 48, 4, orbitCam);
	const trees1 = decorPrefab(world, 'decor-trees', seed, 96, 4, orbitCam);
	const tufts = decorPrefab(world, 'decor-tufts', seed, 6, 6, orbitCam);
	const terrain = terrainPrefab(world, seed, orbitCam);

	world.run();

	// FIXME set default camera to orbit camera
	scene.currentCameraId = 2;
	scene.primaryCameraId = 2;
	// Start main loop
	gfx.run(async (dt) => {
		graphics.update(world, scene);
		await gfx.draw(scene, scene.activeCamera);
	});
}

function getSeed(): number {
	const seedParam = getParam('seed');
	return Math.abs(seedParam ? parseInt(seedParam, 36) : Math.random() * 0x7fffffff | 0);
}
