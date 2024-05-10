export const PHI = (1 + Math.sqrt(5)) / 2;
export type Point4 = [number, number, number, number];
export type Point3 = [number, number, number];
export type Point2 = [number, number];
export type Point = Point2 | Point3 | Point4;
export type Vector4 = [number, number, number, number];
export type Vector3 = [number, number, number];
export type Vector2 = [number, number];
export type Vector = Vector2 | Vector3 | Vector4;
export type Size3 = [number, number, number];
export type Size2 = [number, number];
export type Matrix2 = [
	number, number,
	number, number,
];
export type Matrix3 = [
	number, number, number,
	number, number, number,
	number, number, number,
];
export type Matrix4 = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
];

export type Plane = [Point3, Vector3];

import * as transform from './transform';
export { transform };
