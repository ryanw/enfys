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

/**
 * Start the game
 */
export async function main(el: HTMLCanvasElement) {
	const gfx = await initGfx(el);
	const scene = await initScene(gfx);
	const graphics = await initGraphics(gfx);
	const world = await initWorld(gfx);

	const camera = prefabs.freeCamera(world);
	const planet0 = prefabs.planet(world, [0, 0, 300], 100);
	const planet1 = prefabs.planet(world, [400, 0, 300], 40);
	const player0 = prefabs.player(world, [(Math.random() - 0.5) * 100, Math.random() * 100, 150]);
	const player1 = prefabs.player(world, [(Math.random() - 0.5) * 100, Math.random() * 100, 150]);
	const player2 = prefabs.player(world, [(Math.random() - 0.5) * 100, Math.random() * 100, 150]);
	const player3 = prefabs.player(world, [(Math.random() - 0.5) * 100, Math.random() * 100, 150]);

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

	const planetSeed = 123;
	const planetMesh = new CubeSphere(gfx, 256);
	const planetTerrain = new PlanetTerrainPipeline(gfx);
	const calcNormals = new CalculateNormalsPipeline(gfx);

	const shipMesh = new CubeSphere(gfx, 1);

	await planetTerrain.compute(planetMesh, planetSeed);
	await calcNormals.compute(planetMesh);
	graphics.insertResource('player-ship', shipMesh);
	graphics.insertResource('planet', planetMesh);
	graphics.insertResource('planet-material', new PlanetMaterial(gfx, planetSeed));
	return graphics;
}

async function initWorld(gfx: Gfx): Promise<World> {
	const world = new World();
	world.addSystem(new OrbitCameraInputSystem(gfx.canvas));
	world.addSystem(new FreeCameraInputSystem(gfx.canvas));
	world.addSystem(new PhysicsSystem(gfx));
	return world;
}
