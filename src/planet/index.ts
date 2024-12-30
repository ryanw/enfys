/**
 * Visit small planets
 *
 * @module
 */

import { Gfx } from 'engine';
import { Scene } from 'engine/scene';
import { Icosphere } from 'engine/meshes/icosphere';
import { PlanetMaterial } from './materials/planet';
import { RenderPlanetPipeline } from './pipelines/render_planet';
import { WorldGraphics } from 'engine/world_graphics';
import { World } from 'engine/ecs/world';
import { OrbitCameraInputSystem } from 'engine/ecs/systems/orbit_camera_input';
import { FreeCameraInputSystem } from 'engine/ecs/systems/free_camera_input';
import * as prefabs from './prefabs';
import { CubeSphere } from 'engine/meshes/cubesphere';
import { PlanetTerrainPipeline } from './pipelines/planet_terrain';
import { CalculateNormalsPipeline } from 'engine/pipelines/calculate_normals';
import { CubeMesh } from 'engine/meshes/cube';
import { PhysicsSystem } from './systems/physics';
import { SimpleMaterial } from 'engine/material';
import { ShipMesh } from './meshes/ship';
import { PlayerInputSystem } from './systems/player_input';

/**
 * Start the game
 */
export async function main(el: HTMLCanvasElement) {
	const gfx = await initGfx(el);
	const scene = await initScene(gfx);
	const graphics = await initGraphics(gfx);
	const world = await initWorld(gfx);

	const star = prefabs.star(world, [0, 0, 0], 200);
	const planet = prefabs.planet(world, [-600, 0, -200], 50);
	//const moon0 = prefabs.moon(world, [-600, 0, -500], 10);
	const player = prefabs.player(world, [-600, 0, -320], [0, 0, 200]);

	const bugs = [];
	for (let i = 0; i < 100; i++) {
		const bug = prefabs.bug(world, [
			(Math.random() - 0.5) * 5000,
			(Math.random() - 0.5) * 5000,
			(Math.random() - 0.5) * 5000,
		]);
		bugs.push(bug);
	}

	const camera = prefabs.orbitCamera(world, player);

	scene.currentCameraId = 1;
	scene.primaryCameraId = 1;

	gfx.run(async (dt) => {
		await world.tick(dt);
		graphics.update(world, scene);
		await gfx.draw(scene, scene.activeCamera);
	});
}

async function initGfx(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	gfx.configure({ renderMode: 0, ditherSize: 0, drawShadows: false, drawEdges: 0 });

	return gfx;
}

async function initScene(gfx: Gfx): Promise<Scene> {
	const scene = new Scene(gfx);
	return scene;
}

async function initGraphics(gfx: Gfx): Promise<WorldGraphics> {
	gfx.registerMaterials([
		[PlanetMaterial, RenderPlanetPipeline],
	]);
	const graphics = new WorldGraphics(gfx);
	const planetTerrain = new PlanetTerrainPipeline(gfx);
	const calcNormals = new CalculateNormalsPipeline(gfx);

	graphics.insertResource('tiny-cube', new CubeMesh(gfx, [0, 0, 0], 0.1));

	const playerMesh = new ShipMesh(gfx);
	graphics.insertResource('player-ship', playerMesh);

	const bugMesh = new CubeMesh(gfx);
	graphics.insertResource('bug-ship', bugMesh);

	const planetSeed = Math.random() * 0xffffff | 0;
	const planetMesh = new CubeSphere(gfx, 256);
	await planetTerrain.compute(planetMesh, planetSeed);
	await calcNormals.compute(planetMesh);
	graphics.insertResource('planet', planetMesh);
	graphics.insertResource('planet-material', new PlanetMaterial(gfx, planetSeed));

	const moonSeed = planetSeed + 5342;
	const moonMesh = new CubeSphere(gfx, 128);
	await planetTerrain.compute(moonMesh, moonSeed);
	await calcNormals.compute(moonMesh);
	graphics.insertResource('moon', moonMesh);
	graphics.insertResource('moon-material', new PlanetMaterial(gfx, moonSeed));

	const starSeed = planetSeed + 3214;
	const starMesh = new Icosphere(gfx, 4);
	await planetTerrain.compute(starMesh, starSeed);
	await calcNormals.compute(starMesh);
	graphics.insertResource('star', starMesh);
	graphics.insertResource('star-material', new SimpleMaterial(gfx, 0xffffffffn));

	return graphics;
}

async function initWorld(gfx: Gfx): Promise<World> {
	const world = new World();
	world.addSystem(new PhysicsSystem(gfx));
	world.addSystem(new FreeCameraInputSystem(gfx.canvas));
	world.addSystem(new OrbitCameraInputSystem(gfx.canvas));
	world.addSystem(new PlayerInputSystem(gfx.canvas));
	return world;
}
