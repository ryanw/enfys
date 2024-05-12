import { Gfx } from 'engine';
import { buildIcosahedron } from 'engine/mesh';
import { Camera } from 'engine/camera';
import Scene, { SimpleMesh, TexVertex } from 'engine/scene';
import { cross, normalize, subtract } from 'engine/math/vectors';
import { Point2, Point3, Vector3 } from 'engine/math';
import { rotation } from 'engine/math/transform';

export async function main(el: HTMLCanvasElement) {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx = await Gfx.attach(el);

	const camera = new Camera();
	camera.translate([0.0, 0.0, -4.0]);
	const scene = new Scene();
	scene.clearColor = [70, 10, 130, 200];

	const vertices = buildIcosahedron(position => ({
		position: [...position] as Point3,
		normal: [0, 0, 0] as Vector3,
		uv: [0, 0] as Point2,
	}));
	calculateNormals(vertices);
	const shape = new SimpleMesh(gfx, vertices);
	const cubeId = scene.addMesh(shape);

	async function draw() {
		await gfx.draw(scene, camera);
		shape.transform = rotation(performance.now() / 3000.0, performance.now() / 2000.0, 0);
		requestAnimationFrame(draw);
	}
	await draw();
}

function calculateNormals(vertices: Array<TexVertex>) {
	for (let i = 0; i < vertices.length; i += 3) {
		let p0 = vertices[i + 0].position;
		let p1 = vertices[i + 1].position;
		let p2 = vertices[i + 2].position;

		let v0 = subtract(p2, p0);
		let v1 = subtract(p1, p0);
		let normal = normalize(cross(v0, v1));
		vertices[i + 0].normal = normal;
		vertices[i + 1].normal = normal;
		vertices[i + 2].normal = normal;
	}
}
