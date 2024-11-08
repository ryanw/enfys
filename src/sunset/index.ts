/**
 * A very simple demo
 *
 * @module
 */

import { Gfx, MaterialTuple } from 'engine';
import { CubeMesh, Icosphere, InnerIcosphere, QuadMesh } from 'engine/mesh';
import { Scene } from 'engine/scene';
import { World } from 'engine/ecs/world';
import { WorldGraphics } from 'engine/world_graphics';
import { RenderPlanetPipeline } from './pipelines/render_planet';
import { TerrainSystem } from 'engine/ecs/systems/terrain';
import heightShaderSource from './shaders/terrain_height.wgsl';
import * as prefabs from './prefabs';
import { WireMaterial } from './materials/wire';
import { PlanetMaterial } from './materials/planet';
import { RenderWiresPipeline } from './pipelines/render_wires';
import { VehicleSystem } from './systems/vehicle';
import { OrbitCameraInputSystem } from 'engine/ecs/systems/orbit_camera_input';
import { SimplePhysicsSystem } from './systems/physics';
import { RenderRoadPipeline } from './pipelines/render_road';
import { RoadMaterial } from './materials/road';
import { TreeMesh } from '../landscape/meshes/tree';
import { SunMaterial } from './materials/sun';
import { RenderSunPipeline } from './pipelines/render_sun';
import { hsl } from 'engine/color';
import { SkyMaterial } from './materials/sky';
import { RenderSkyPipeline } from './pipelines/render_sky';
import { Vector3 } from 'engine/math';
import * as vec from 'engine/math/vectors';

const PIXEL_SIZE = 1;
const MATERIALS: Array<MaterialTuple> = [
	[PlanetMaterial, RenderPlanetPipeline],
	[WireMaterial, RenderWiresPipeline],
	[RoadMaterial, RenderRoadPipeline],
	[SkyMaterial, RenderSkyPipeline],
	[SunMaterial, RenderSunPipeline],
];

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	const scene = new Scene(gfx);
	scene.waterColor = [0, 200, 190, 100];
	scene.fogColor = hsl(0.57, 0.7, 0.4);
	gfx.configure({
		renderMode: 0,
		drawEdges: false,
		ditherSize: 0,
		ditherDepth: 4,
		canvasPixelRatio: 1 / PIXEL_SIZE,
	});

	gfx.registerMaterials(MATERIALS);

	const graphics = new WorldGraphics(gfx, heightShaderSource);
	graphics.insertResource('planet', new Icosphere(gfx, 1));
	graphics.insertResource('sun', new Icosphere(gfx, 4));
	graphics.insertResource('sky', new InnerIcosphere(gfx, 3));
	graphics.insertResource('road', new CubeMesh(gfx, [0, 0, 0], [7.9, 0.1, 2000]));
	graphics.insertResource('building', new CubeMesh(gfx));
	graphics.insertResource('car', new CubeMesh(gfx, [4, 3, 7], [1, 0.5, 2]));
	graphics.insertResource('decor-trees', new TreeMesh(gfx, 0, 16));

	graphics.insertResource('planet-material', new WireMaterial(gfx, 0xff000000n, 0xff11ffffn, true));
	graphics.insertResource('sun-material', new SunMaterial(gfx, scene.fogColor));
	graphics.insertResource('terrain-material', new WireMaterial(gfx, 0xff551144n, 0xffbb11ffn));
	graphics.insertResource('road-material', new RoadMaterial(gfx, 0xff111111n, 0xff11ffffn));
	graphics.insertResource('car-material', new WireMaterial(gfx, 0xff115522n, 0xff22ff11n));
	graphics.insertResource('sky-material', new SkyMaterial(gfx, scene.fogColor));


	const world = new World();
	world.addSystem(new TerrainSystem(gfx, 1, 1, 5));
	world.addSystem(new VehicleSystem());
	world.addSystem(new SimplePhysicsSystem());
	world.addSystem(new OrbitCameraInputSystem(el));

	const skyRadius = 3400.0;
	const skyPoint = (dir: Vector3) => vec.scale(vec.normalize(dir), skyRadius);
	prefabs.light(world, [2.8, 0, 0]);
	prefabs.sky(world, skyRadius);
	prefabs.planet(world, skyPoint([100, 80, 400]), 150);
	prefabs.planet(world, skyPoint([-150, 30, 400]), 150);
	prefabs.sun(world, skyPoint([0, 0.04, 1]), 500);
	prefabs.road(world, [0, 2.002, 0]);

	const car = prefabs.car(world, [2, 3, 0]);
	prefabs.terrain(world, car);
	prefabs.orbitCamera(world, car);
	prefabs.decor(world, 'decor-trees', 0, 32, 4, car);

	scene.currentCameraId = 1;
	scene.primaryCameraId = 1;
	scene.activeCamera.rotate(0.4, 0.5);
	gfx.run(async (dt) => {
		world.tick(dt);
		graphics.update(world, scene);
		await gfx.draw(scene, scene.activeCamera);
	});

	return gfx;
}

