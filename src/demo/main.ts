import { Gfx, Size, UnsupportedError } from 'engine';
import { Cube, Icosahedron, QuadMesh, SimpleMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Entity, Scene } from 'engine/scene';
import { multiply, rotation, translation } from 'engine/math/transform';
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
	let gfx: Gfx;
	try {
		gfx = await Gfx.attach(el);
	} catch (e) {
		if (e instanceof UnsupportedError) {
			alert(e.toString());
		}
		throw e;
	}

	gfx.canvasPixelRatio = 1;

	const seed = Math.random();
	const chunkSize: Size = [64, 64];
	const chunkScale: Vector2 = [512, 512];

	const camera = new Camera(gfx);
	camera.translate([0, 96, 0]);
	camera.rotate(0.07, 0);
	const cameraController = new CameraController(el, camera);
	const scene = new Scene(gfx);

	const hue = randRange(0, 1);
	const waterHue = (hue + randRange(0.2, 0.8)) % 1.0;
	const terrain = new QuadMesh(gfx, chunkSize, chunkScale);
	const terrainMaterial = new Material(gfx, hsl(hue, 0.5, 0.5));
	scene.add(new Entity(
		gfx,
		terrain,
		terrainMaterial,
		translation(0, 0, chunkScale[1]),
	));
	const terrainPipeline = new TerrainPipeline(gfx);
	await terrainPipeline.compute(terrain, seed);

	const water = new QuadMesh(gfx, chunkSize, chunkScale);
	const waterMaterial = new Material(gfx, hsl(waterHue, 0.5, 0.5));
	scene.add(new Entity(
		gfx,
		water,
		waterMaterial,
		translation(0, 6, chunkScale[1]),
	));
	const waterPipeline = new WaterPipeline(gfx);
	async function updateTerrain() {
		await waterPipeline.compute(water, seed + performance.now() / 1000);
	}

	function update(dt: number) {
		updateTerrain();
	}

	gfx.run(async (dt) => {
		cameraController.update(dt);
		update(dt);
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
