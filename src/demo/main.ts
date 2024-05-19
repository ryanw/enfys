import { Gfx, Size } from 'engine';
import { QuadMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Entity, Scene } from 'engine/scene';
import { translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { hsl } from 'engine/color';
import { CameraController } from 'engine/input';
import { TerrainPipeline } from './pipelines/terrain';
import { WaterPipeline } from './pipelines/water';
import { Vector2 } from 'engine/math';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	const seed = Math.random();

	const chunkSize: Size = [64, 64];
	const chunkScale: Vector2 = [64, 64];

	const camera = new Camera(gfx);
	camera.translate([0, 64, -64]);
	camera.rotate(0.15, 0);
	const cameraController = new CameraController(el, camera);
	const scene = new Scene(gfx);

	const hue = randRange(0, 1);
	const waterHue = (hue + randRange(0.2, 0.8)) % 1.0;
	const terrain = new QuadMesh(gfx, chunkSize, chunkScale);
	const terrainMaterial = new Material(gfx, hsl(hue, 0.5, 0.5));
	scene.addEntity(new Entity(
		gfx,
		terrain,
		terrainMaterial,
		translation(0, 0, chunkScale[1]),
	));
	const terrainPipeline = new TerrainPipeline(gfx);
	await terrainPipeline.compute(terrain, seed);

	const water = new QuadMesh(gfx, chunkSize, chunkScale);
	const waterMaterial = new Material(gfx, hsl(waterHue, 0.5, 0.5));
	scene.addEntity(new Entity(
		gfx,
		water,
		waterMaterial,
		translation(0, 0, chunkScale[1]),
	));
	const waterPipeline = new WaterPipeline(gfx);

	gfx.run(async (dt) => {
		cameraController.update(dt);
		await waterPipeline.compute(water, seed + performance.now() / 1000);
		await gfx.draw(scene, camera);
	});

	return gfx;
}

function randRange(min: number = 0, max: number = 1): number {
	const l = Math.min(min, max);
	const r = Math.max(min, max);
	const d = r - l;

	return l + Math.random() * d;
}
