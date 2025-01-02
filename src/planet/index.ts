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
import { magnitude, subtract } from 'engine/math/vectors';

/**
 * Start the game
 */
export async function main(el: HTMLCanvasElement) {
	const gfx = await initGfx(el);
	const scene = await initScene(gfx);
	const world = await initWorld(gfx);

	const rng = randomizer(Math.random() * 0x7fffff | 0);
	const rnd = () => rng() * 2.0 - 1.0;
	const graphics = await initGraphics(gfx, rng() * 0x7fffff);

	const { max, abs } = Math;
	const planetCount = 24;


	const planets: Array<Point3> = [];
	function isSafe(p0: Point3): boolean {
		for (const p1 of planets) {
			if (magnitude(subtract(p0, p1)) < 1000.0) {
				return false;
			}
		}
		return true;
	}

	for (let i = 0; i < planetCount; i++) {
		const spread = i === 0 ? 0 : 4000;
		const planetSpeed = i;//10 + rnd() * 300.0;
		const planetRad = 100 + abs(rnd()) * 200.0;
		const waterRad = max(10, planetRad - 6 - 32 * abs(rnd()));

		let position: Point3 = [rnd() * spread, rnd() * spread, rnd() * spread];

		if (!isSafe(position)) {
			continue;
		}
		planets.push(position);

		prefabs.planet(world, position, planetRad, [planetSpeed, planetSpeed, 0]);
		prefabs.water(world, position, waterRad, [planetSpeed, planetSpeed, 0]);
	}

	const player = prefabs.player(world, [0, -500, 0], [0, 0, 0]);
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



async function initGraphics(gfx: Gfx, planetSeed: number): Promise<WorldGraphics> {
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
	world.addSystem(new FreeCameraInputSystem(gfx.canvas));
	world.addSystem(new OrbitCameraInputSystem(gfx.canvas));
	world.addSystem(new FollowCameraSystem(gfx.canvas));
	world.addSystem(new PlayerInputSystem(gfx.canvas));
	return world;
}
