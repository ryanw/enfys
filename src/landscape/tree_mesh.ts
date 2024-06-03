import { Point3 } from 'engine/math';
import { CUBE_VERTS, buildIcosahedron } from 'engine/mesh';

export function buildTreeMesh<T>(callback: (position: Point3, index: number) => T): Array<T> {
	const trunk: Point3[] = CUBE_VERTS.map(p => [p[0] / 2.0, p[1] * 10.0, p[2] / 2.0]);
	const bush: Point3[] = buildIcosahedron(p => [
		p[0] * 4.0,
		p[1] * 4.0 + 8.0,
		p[2] * 4.0,
	]);
	return [...trunk, ...bush].map(callback);
}
