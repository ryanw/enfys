import { Vector3 } from 'engine/math';
import { add } from 'engine/math/vectors';
import { PointVertex } from 'engine/mesh';
import { pcg3d } from 'engine/noise';

export function jiggleVertices(vertices: Array<PointVertex>, amount: number = 1, seed: number = 123) {
	for (const vertex of vertices) {
		const n0 = pcg3d(add(vertex.position, [123 + seed * 3, 456 + seed *1, 321 - seed * 7])).map(v => amount * ((v - 0.5) / 24.0)) as Vector3;
		vertex.position = add(vertex.position, n0);
	}
}
