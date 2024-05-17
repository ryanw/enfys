import { Gfx, UnsupportedError } from 'engine';
import { Cube, Icosahedron, QuadMesh, SimpleMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Entity, Scene } from 'engine/scene';
import { multiply, rotation, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { hsl } from 'engine/color';
import { CameraController } from 'engine/input';
import { TerrainPipeline } from './pipelines/terrain';
import { WaterPipeline } from './pipelines/water';

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

	//if (window.devicePixelRatio >= 2) {
	//	gfx.pixelRatio = 1 / 3;
	//} else {
	//	gfx.pixelRatio = 1 / 2;
	//}
	if (window.devicePixelRatio >= 2) {
		gfx.canvasPixelRatio = 1 / 3;
	} else {
		gfx.canvasPixelRatio = 1 / 2;
	}

	const camera = new Camera(gfx);
	camera.translate([0, 30, 0]);
	camera.rotate(0.11, 0);
	const cameraController = new CameraController(el, camera);
	const scene = new Scene(gfx);
	const cube = new Cube(gfx);
	const icosahedron = new Icosahedron(gfx);
	const shapes: Array<Entity<SimpleMesh>> = [];

	const entity = new Entity(
		gfx,
		cube,
		new Material(gfx, hsl(randRange(0, 1), 0.5, 0.5)),
		translation(0, 0, 9),
	);
	scene.add(entity);
	shapes.push(entity);

	for (let i = 0; i < 100; i++) {
		const r = 128;
		const x = randRange(-r, r);
		const y = randRange(10, 32);
		const z = randRange(-r, r);

		const entity = new Entity(
			gfx,
			icosahedron,
			new Material(gfx, hsl(randRange(0, 1), 0.5, 0.5)),
			translation(x, y, z),
		);
		scene.add(entity);
		shapes.push(entity);
	}

	const terrain = new QuadMesh(gfx, [64, 64], [256, 256]);
	const terrainMaterial = new Material(gfx, hsl(0.3, 0.5, 0.5));
	scene.add(new Entity(
		gfx,
		terrain,
		terrainMaterial,
		translation(0, -2, 0),
	));
	const terrainPipeline = new TerrainPipeline(gfx);
	await terrainPipeline.compute(terrain);

	const water = new QuadMesh(gfx, [64, 64], [256, 256]);
	const waterMaterial = new Material(gfx, hsl(0.6, 0.5, 0.5));
	scene.add(new Entity(
		gfx,
		water,
		waterMaterial,
		translation(0, 2, 0),
	));
	const waterPipeline = new WaterPipeline(gfx);

	scene.add(new Entity(
		gfx,
		icosahedron,
		new Material(gfx, hsl(randRange(0, 1), 0.5, 0.5)),
		translation(0, 3, 9),
	));


	async function updateTerrain() {
		await waterPipeline.compute(water, performance.now() / 1000);
	}

	function update(dt: number) {
		updateTerrain();
		for (const shape of shapes) {
			shape.transform = multiply(shape.transform, rotation(0.4 * dt, 0.2 * dt, 0.8 * dt));
		}
	}

	gfx.run(async (dt) => {
		cameraController.update(dt);
		update(dt);
		await gfx.draw(scene, camera);
	});

	return gfx;
}

function randRange(min: number, max: number): number {
	const l = Math.min(min, max);
	const r = Math.max(min, max);
	const d = r - l;

	return l + Math.random() * d;
}
