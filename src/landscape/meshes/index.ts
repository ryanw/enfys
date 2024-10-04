import { Point3, Vector3 } from 'engine/math';
import { multiply, rotationFromVector, transformPoint, translation } from 'engine/math/transform';
import { add, magnitude, normalize, scale, subtract } from 'engine/math/vectors';
import { PointVertex, buildCylinder } from 'engine/mesh';
import { pcg3d } from 'engine/noise';

export function jiggleVertices(vertices: Array<PointVertex>, amount: number = 1, seed: number = 123) {
	for (const vertex of vertices) {
		const n0 = pcg3d(add(vertex.position, [123 + seed * 3, 456 + seed *1, 321 - seed * 7])).map(v => amount * ((v - 0.5) / 24.0)) as Vector3;
		vertex.position = add(vertex.position, n0);
	}
}

export function buildSegment(p0: Point3, p1: Point3, radius: number = 1.0, divisions: [number, number] = [3, 1]): Array<Point3> {
	const mid = scale(add(p0, p1), 0.5);
	const h = magnitude(subtract(p0, p1));
	const dir = normalize(subtract(p1, p0));
	const branchRotation = rotationFromVector(dir, [0, 1, 0]);
	const branchTranslate = translation(...mid);
	const transform = multiply(branchTranslate, branchRotation);
	return buildCylinder(h, radius, divisions).map(position => transformPoint(transform, position));
}
