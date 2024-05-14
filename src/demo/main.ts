import { Gfx, UnsupportedError, calculateNormals } from 'engine';
import { Cube, Icosahedron, SimpleMesh, buildIcosahedron } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Drawable, Scene } from 'engine/scene';
import { Point2, Point3, Vector3 } from 'engine/math';
import { multiply, rotation, translation } from 'engine/math/transform';
import { Material } from 'engine/material';
import { hsl } from 'engine/color';

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement) {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	let gfx: Gfx;
	try {
		gfx = await Gfx.attach(el);
	} catch (e) {
		if (e instanceof UnsupportedError) {
			alert(e.toString());
			return;
		}
		throw e;
	}

	const camera = new Camera();
	const scene = new Scene();

	const cube = new Icosahedron(gfx);

	const shapes: Array<Drawable<SimpleMesh>> = [];
	for (let i = 0; i < 100; i++) {
		const r = 50;
		const x = randRange(-r, r);
		const y = randRange(-r, r);
		const z = randRange(-r, r);
		const hue = randRange(0, 1);
		const shape = {
			object: cube,
			transform: translation(x, y, z),
			material: new Material(hsl(hue, 0.5, 0.5)),
		};
		shapes.push(shape);
		scene.addMesh(shape);
	}


	let now = performance.now();
	let dt = 0;
	async function draw() {
		dt = now - performance.now();
		now = performance.now();

		for (const shape of shapes) {
			update(shape, dt / 1000);
		}

		await gfx.draw(scene, camera);
		requestAnimationFrame(draw);
	}
	await draw();
}

function update<T>(shape: Drawable<T>, dt: number) {
	shape.transform = multiply(shape.transform, rotation(-0.4 * dt, 0.3 * dt, 1 * dt));
}

function randRange(min: number, max:number):number {
	const l = Math.min(min, max);
	const r = Math.max(min, max);
	const d = r - l;
	
	return l + Math.random() * d;
}
