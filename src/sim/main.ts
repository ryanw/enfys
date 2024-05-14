import { Gfx, UnsupportedError } from 'engine';
import { SimpleMesh, TextureVertex, buildIcosahedron } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { cross, normalize, subtract } from 'engine/math/vectors';
import { Point2, Point3, Vector3 } from 'engine/math';
import { identity, rotation } from 'engine/math/transform';
import { Material } from 'engine/material';

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
	camera.translate([0, 0, -3.5]);
	const scene = new Scene();
	//scene.clearColor = [155, 188, 15, 255];

	const vertices = buildIcosahedron(position => ({
		position: [...position] as Point3,
		normal: [0, 0, 0] as Vector3,
		uv: [0, 0] as Point2,
	}));
	calculateNormals(vertices);
	const shape = {
		object: new SimpleMesh(gfx, vertices),
		transform: identity(),
		material: new Material([200, 80, 20, 255]),
	};
	scene.addMesh(shape);

	async function draw() {
		shape.transform = rotation(performance.now() / 3000.0, performance.now() / 2000.0, 0);
		await gfx.draw(scene, camera);
		requestAnimationFrame(draw);
	}
	await draw();
}

function calculateNormals(vertices: Array<TextureVertex>) {
	for (let i = 0; i < vertices.length; i += 3) {
		const p0 = vertices[i + 0].position;
		const p1 = vertices[i + 1].position;
		const p2 = vertices[i + 2].position;

		const v0 = subtract(p2, p0);
		const v1 = subtract(p1, p0);
		const normal = normalize(cross(v0, v1));
		vertices[i + 0].normal = normal;
		vertices[i + 1].normal = normal;
		vertices[i + 2].normal = normal;
	}
}
