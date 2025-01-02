/**
 * A very simple demo
 *
 * @module
 */

import { Gfx, MaterialTuple } from 'engine';
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
import { CarMaterial } from './materials/car';
import { RenderCarPipeline } from './pipelines/render_car';
import { FreeCameraInputSystem } from 'engine/ecs/systems/free_camera_input';
import { TuftMesh } from '../landscape/meshes/tuft';
import { FlowersMesh } from '../landscape/meshes/flowers';
import { VehicleInputSystem } from './systems/vehicle_input';
import { Icosphere, InnerIcosphere } from 'engine/meshes/icosphere';
import { CubeMesh } from 'engine/meshes/cube';
import { FollowSystem } from 'engine/ecs/systems/follow';

const PIXEL_SIZE = 1;
const MATERIALS: Array<MaterialTuple> = [
	[PlanetMaterial, RenderPlanetPipeline],
	[WireMaterial, RenderWiresPipeline],
	[RoadMaterial, RenderRoadPipeline],
	[SkyMaterial, RenderSkyPipeline],
	[CarMaterial, RenderCarPipeline],
	[SunMaterial, RenderSunPipeline],
];

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attach(el);
	const scene = new Scene(gfx);
	const rootSeed = 4;//Math.random() * 0xffffff | 0;
	let seedIdx = 0;
	const nextSeed = () => (rootSeed + 123 * seedIdx++) % 0xffffff;

	scene.waterColor = hsl(0.9, 0.7, 0.4, 0.5);
	scene.fogColor = hsl(0.52, 0.7, 0.4);
	gfx.configure({
		renderMode: 0,
		drawEdges: 0,
		ditherSize: 0,
		ditherDepth: 5,
		canvasPixelRatio: 1 / PIXEL_SIZE,
	});

	gfx.registerMaterials(MATERIALS);

	const graphics = new WorldGraphics(gfx, heightShaderSource);
	graphics.insertResource('sun', new Icosphere(gfx, 4));
	graphics.insertResource('sky', new InnerIcosphere(gfx, 4));
	graphics.insertResource('road', new CubeMesh(gfx, [0, 0, 1024], [8, 0.2, 2048]));
	graphics.insertResource('building', new CubeMesh(gfx));
	graphics.insertResource('car', new CubeMesh(gfx, [4, 2, 8] as any, [1.25, 0.5, 2]));
	graphics.insertResource('decor-trees', new TreeMesh(gfx, 0, 8, 2));
	graphics.insertResource('decor-tufts', new TuftMesh(gfx, 0, 8, 4));
	graphics.insertResource('decor-flowers', new FlowersMesh(gfx, 0, 32, 5));
	graphics.insertResource('tiny-cube', new CubeMesh(gfx, [0, 0, 0], 0.05));

	graphics.insertResource('sun-material', new SunMaterial(gfx, scene.fogColor));
	graphics.insertResource('terrain-material', new WireMaterial(gfx, 0xff554411n, 0xffffbb11n, 0xffbb11ffn));
	graphics.insertResource('tree-material', new WireMaterial(gfx, 0xff11aa33n, 0xff11ffaan, 0xffbb11ffn, true));
	graphics.insertResource('grass-material', new WireMaterial(gfx, 0xff11aa33n, 0xff11ffaan, 0xffbb11ffn, false));
	graphics.insertResource('road-material', new RoadMaterial(gfx, 0xff111111n, 0xff11ffffn));
	graphics.insertResource('car-material', new CarMaterial(gfx, 0xff117722n, 0xff11ff33n));
	graphics.insertResource('sky-material', new SkyMaterial(gfx, scene.fogColor));

	for (let i = 0; i < 3; i++) {
		graphics.insertResource(`planet${i}`, new Icosphere(gfx, 4));
		graphics.insertResource(`planet${i}-material`, new PlanetMaterial(gfx, nextSeed()));
	}


	const world = new World();
	world.addSystem(new TerrainSystem(gfx, 1, 1, 2));
	world.addSystem(new VehicleSystem(gfx));
	world.addSystem(new VehicleInputSystem(el));
	world.addSystem(new SimplePhysicsSystem());
	world.addSystem(new OrbitCameraInputSystem(el));
	world.addSystem(new FreeCameraInputSystem(el));
	world.addSystem(new FollowSystem());

	const car = prefabs.car(world, [-3, 6, 0]);
	const cam1 = prefabs.orbitCamera(world, car);
	const cam2 = prefabs.freeCamera(world);

	const skyRadius = 3400.0;
	const skyPoint = (dir: Vector3) => vec.scale(vec.normalize(dir), skyRadius * 0.9);
	prefabs.light(world, [2.8, 0, 0]);
	prefabs.sky(world, skyRadius, car);
	prefabs.planet(world, skyPoint([100, 80, 400]), 150, 0.1, car);
	prefabs.planet(world, skyPoint([-150, 70, 400]), 100, 0.3, car);
	prefabs.sun(world, skyPoint([0, 0.04, 1]), 500, car);
	prefabs.road(world, [0, 5, 0], car);
	prefabs.terrain(world, cam1);

	prefabs.decor(world, 'decor-trees', 'tree-material', 1000, 48, 3, cam1);
	prefabs.decor(world, 'decor-tufts', 'tree-material', 2000, 24, 2, cam1);
	prefabs.decor(world, 'decor-flowers', 'tree-material', 3000, 32, 2, cam1);

	scene.currentCameraId = 1;
	scene.primaryCameraId = 1;

	gfx.run(async (dt) => {
		await world.tick(dt);
		graphics.update(world, scene);
		await gfx.draw(scene, scene.activeCamera);
	});

	return gfx;
}

