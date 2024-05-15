import { Gfx, UnsupportedError } from 'engine';
import { Cube, Icosahedron, QuadMesh, SimpleMesh } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Drawable, Scene } from 'engine/scene';
import { multiply, rotation, scaling, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { hsl } from 'engine/color';
import { CameraController } from 'engine/input';
import { TerrainPipeline } from './pipelines/terrain';

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

	if (window.devicePixelRatio >= 2) {
		gfx.pixelRatio = 1/3;
	} else {
		gfx.pixelRatio = 1/2;
	}

	const camera = new Camera();
	camera.translate([0, 30, 0]);
	camera.rotate(0.11, 0);
	const cameraController = new CameraController(el, camera);
	const scene = new Scene();

	const cube = new Cube(gfx);
	const icosahedron = new Icosahedron(gfx);
	const shapes: Array<Drawable<SimpleMesh>> = [];

	const shape = {
		object: cube,
		transform: translation(0, 0, 9),
		material: new Material(hsl(randRange(0, 1), 0.5, 0.5)),
	};
	shapes.push(shape);
	scene.addMesh(shape);

	for (let i = 0; i < 100; i++) {
		const r = 128;
		const x = randRange(-r, r);
		const y = randRange(10, 32);
		const z = randRange(-r, r);
		const shape = {
			object: icosahedron,
			transform: translation(x, y, z),
			material: new Material(hsl(randRange(0, 1), 0.5, 0.5)),
		};
		shapes.push(shape);
		scene.addMesh(shape);
	}

	const terrain = new QuadMesh(gfx, [64, 64]);

	scene.addMesh({
		transform: multiply(
			translation(0, -2, 10),
			scaling(512, 1, 512),
		),
		object: terrain,
		material: new Material(hsl(randRange(0, 1), 0.5, 0.5)),
	});

	scene.addMesh({
		transform: translation(0, 3, 9),
		object: icosahedron,
		material: new Material(hsl(randRange(0, 1), 0.5, 0.5)),
	});







	function updateShape<T>(shape: Drawable<T>, dt: number) {
		shape.transform = multiply(shape.transform, rotation(-0.4 * dt, 0.3 * dt, 1 * dt));
	}

	const terrainPipeline = new TerrainPipeline(gfx);
	async function updateTerrain(terrain: QuadMesh, t: number) {
		await terrainPipeline.compute(terrain, t);
	}



	gfx.run(async (dt) => {
		cameraController.update(dt);
		updateTerrain(terrain, performance.now() / 1000);
		for (const shape of shapes) {
			updateShape(shape, dt);
		}
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
