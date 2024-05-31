import { Vector3 } from "./math";

// http://www.jcgt.org/published/0009/03/02/
// FIXME doesn't work well in JavaScript
export function pcg3d(v: Vector3): Vector3 {
	let n  = v.map(i => i * 1664525 + 1013904223) as Vector3;

	n[0] += n[1] * n[2];
	n[1] += n[2] * n[0];
	n[2] += n[0] * n[1];

	n = n.map(i => ((i ^ (i >> 16)) / 0xffffffff) + 0.4) as Vector3;

	n[0] += n[1] * n[2];
	n[1] += n[2] * n[0];
	n[2] += n[0] * n[1];

	return n;
}

export type Randomizer = (l: number, r: number, t?: number) => number;
export function randomizer(seed: number): Randomizer {
	let rndIdx = 100;
	return (l: number, r: number, t: number = 321) => pcg3d([t * 10, seed/10000, rndIdx++ * 10])[0] * (r - l) + l;
}
