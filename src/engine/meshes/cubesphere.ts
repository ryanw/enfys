import { Gfx, calculateNormals } from 'engine';
import { Point2, Point3, Vector3 } from 'engine/math';
import { add, cross, normalize, scale } from 'engine/math/vectors';
import { ColorInstance, ColorVertex, SimpleMesh } from 'engine/mesh';


/**
 * Sphere Mesh created from subdivided icosahedron
 */
export class CubeSphere extends SimpleMesh {
	constructor(gfx: Gfx, divisions: number = 1, instances?: Array<ColorInstance>) {
		const buildVertex = (position: Point3): ColorVertex => ({
			softness: 0.0,
			position: [...position],
			normal: normalize(position),
			color: BigInt(0xffffffff),
		})
		const vertices = [
			...buildCubeFace(divisions, [0, 1, 0], buildVertex),
			...buildCubeFace(divisions, [0, -1, 0], buildVertex),
			...buildCubeFace(divisions, [1, 0, 0], buildVertex),
			...buildCubeFace(divisions, [-1, 0, 0], buildVertex),
			...buildCubeFace(divisions, [0, 0, 1], buildVertex),
			...buildCubeFace(divisions, [0, 0, -1], buildVertex),
		];
		console.debug("Created cubesphere with %d triangles", vertices.length / 3);
		super(gfx, vertices, instances);
	}
}

/**
 * Build one side of the cube sphere.
 * @param divisions Number of times to subdivide the face
 * @param normal Direction face should point
 */
export function buildCubeFace<T>(
	divisions: number,
	normal: Vector3,
	callback: (position: Point3, index: number) => T,
): Array<T> {
	const data: Array<T> = new Array(divisions * divisions);
	const axisA: Point3 = [normal[1], normal[2], normal[0]];
	const axisB = cross(normal, axisA);

	const vertices = new Array(divisions * divisions);
	const triangles = new Array((divisions - 1) * (divisions - 1));

	const d = divisions + 2;

	let tri = 0;
	const sub = 1 / (d - 1);
	for (let y = 0; y < d; y++) {
		for (let x = 0; x < d; x++) {
			const p: Point2 = [x * sub, y * sub];
			const hp = [(p[0] - 0.5) * 2.0, (p[1] - 0.5) * 2.0];
			let position = normal;
			position = add(position, scale([hp[0], hp[0], hp[0]], axisA));
			position = add(position, scale([hp[1], hp[1], hp[1]], axisB));
			position = normalize(position);
			const i = x + y * d;
			vertices[i] = callback(position, i);

			if (x < d - 1 && y < d - 1) {
				triangles[tri++] = i;
				triangles[tri++] = i + d + 1;
				triangles[tri++] = i + d;
				triangles[tri++] = i;
				triangles[tri++] = i + 1;
				triangles[tri++] = i + d + 1;
			}
		}
	}

	for (let i = 0; i < triangles.length; i++) {
		data[i] = vertices[triangles[i]];
	}
	return data;
}
