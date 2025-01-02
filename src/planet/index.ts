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
import { FollowCameraSystem } from 'engine/ecs/systems/follow_camera';
import { WaterMaterial } from './materials/water';
import { RenderWaterPipeline } from './pipelines/render_water';
import { Point3 } from 'engine/math';
import { randomizer } from 'engine/noise';
import { add, magnitude, subtract } from 'engine/math/vectors';
import { Galaxy, Planet, StarSystem } from './galaxy';
import { Entity } from 'engine/ecs';
import { TransformComponent } from 'engine/ecs/components';
import { OrbitsSystem } from './systems/orbits';

/**
 * Start the game
 */
export async function main(el: HTMLCanvasElement) {
	const gfx = await initGfx(el);
	const scene = await initScene(gfx);
	const world = await initWorld(gfx);
	const graphics = await initGraphics(gfx);

	const starSystem = new StarSystem(BigInt(Math.random()*0xffffffff|0));


	for (const star of starSystem.stars()) {
		prefabs.star(world, star.position, star.radius);
	}

	const planets = Array.from(starSystem.planets());
	const planetEntities: Array<[Planet, Entity, Entity]> = [];
	for (const planet of planets) {
		const position = planet.positionAtTime(0.0);
		const p = prefabs.planet(world, position, planet);
		const w = prefabs.water(world, position, planet);
		planetEntities.push([planet, p, w]);
	}

	const planet = planets[2];
	const playerStart: Point3 = add(planet.positionAtTime(0), [0, 0, -planet.radius - 1000.0]);
	const player = prefabs.player(world, playerStart, [0, 0, 0]);
	const camera = prefabs.followCamera(world, player);


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



async function initGraphics(gfx: Gfx, planetSeed: number = 0): Promise<WorldGraphics> {
	gfx.registerMaterials([
		[PlanetMaterial, RenderPlanetPipeline],
		[WaterMaterial, RenderWaterPipeline],
	]);
	const graphics = new WorldGraphics(gfx);
	const planetTerrain = new PlanetTerrainPipeline(gfx);
	const calcNormals = new CalculateNormalsPipeline(gfx);

	const planetMesh = new Icosphere(gfx, 6);
	// Will use the variantIndex as the seed
	planetMesh.variantCount = 10000;
	graphics.insertResource('planet', planetMesh);
	graphics.insertResource('planet-material', new PlanetMaterial(gfx, planetSeed, 0.0));

	const waterMesh = new Icosphere(gfx, 4);
	waterMesh.variantCount = 10000;
	graphics.insertResource('water', waterMesh);
	graphics.insertResource('water-material', new WaterMaterial(gfx, planetSeed + 1231));


	graphics.insertResource('tiny-cube', new CubeMesh(gfx, [0, 0, 0], 0.01));


	const playerMesh = new ShipMesh(gfx);
	graphics.insertResource('player-ship', playerMesh);

	const bugMesh = new CubeMesh(gfx);
	graphics.insertResource('bug-ship', bugMesh);




	const moonSeed = planetSeed + 5342;
	const moonMesh = new CubeSphere(gfx, 128);
	await planetTerrain.compute(moonMesh, moonSeed);
	await calcNormals.compute(moonMesh);
	graphics.insertResource('moon', moonMesh);
	graphics.insertResource('moon-material', new PlanetMaterial(gfx, moonSeed, 0.0));

	const starSeed = planetSeed + 3214;
	const starMesh = new CubeSphere(gfx, 128);
	await planetTerrain.compute(starMesh, starSeed, { seaLevel: 0 });
	await calcNormals.compute(starMesh);
	graphics.insertResource('star', starMesh);
	graphics.insertResource('star-material', new SimpleMaterial(gfx, 0xffffffffn));

	return graphics;
}

async function initWorld(gfx: Gfx): Promise<World> {
	const world = new World();
	world.addSystem(new PhysicsSystem(gfx));
	world.addSystem(new OrbitsSystem());
	world.addSystem(new FreeCameraInputSystem(gfx.canvas));
	world.addSystem(new OrbitCameraInputSystem(gfx.canvas));
	world.addSystem(new FollowCameraSystem(gfx.canvas));
	world.addSystem(new PlayerInputSystem(gfx.canvas));
	return world;
}
