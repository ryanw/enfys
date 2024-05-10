import { Plane, Point3, Vector2, Vector3, Vector4 } from '.';

export function scale<T extends Vector2 | Vector3 | Vector4>(v: T, scale: number): T {
	return v.map((n: number) => n * scale) as T;
}

export function magnitude<T extends number[]>(v: T): number {
	let acc = 0;
	for (const n of v) {
		acc += Math.pow(n, 2);
	}
	return Math.sqrt(acc);
}

export function normalize<T extends number[]>(v: T): T {
	const mag = magnitude(v);
	return v.map(n => n / mag) as T;
}

export function subtract<T extends number[]>(a: T, b: T): T {
	return a.map((n, i) => n - (b[i] || 0)) as T;
}

export function add<T extends number[]>(a: T, b: T): T {
	return a.map((n, i) => n + (b[i] || 0)) as T;
}

export function dot<T extends number[]>(a: T, b: T): number {
	return a.map((n, i) => n * (b[i] || 0)).reduce((a, b) => a + b);
}

export function reflect(p: Point3, [origin, normal]: Plane): Point3 {
	const offset = subtract(p, origin);
	const s = dot(offset, normalize(normal)) * 2.0;
	return subtract(p, scale(normal, s));
}

export function cross(v0: Vector3, v1: Vector3): Vector3 {
	const x = v0[1] * v1[2] - v0[2] * v1[1];
	const y = v0[2] * v1[0] - v0[0] * v1[2];
	const z = v0[0] * v1[1] - v0[1] * v1[0];
	return [x, y, z];
}
