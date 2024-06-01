import { BigVector3, Vector3 } from "./math";

// http://www.jcgt.org/published/0009/03/02/
export function pcg3d(v: Vector3): Vector3 {
	let n0  = v.map(i => BigInt(i * 1664525 | 0) + BigInt(1013904223)) as BigVector3;

	n0[0] += n0[1] * n0[2];
	n0[1] += n0[2] * n0[0];
	n0[2] += n0[0] * n0[1];

	n0 = n0.map(v => v % BigInt(0xffffffff)) as BigVector3;

	let n1 = n0.map(i => Number(i ^ (i >> BigInt(16))) * (1.0 / 0xffffffff)) as Vector3;

	n1[0] += n1[1] * n1[2];
	n1[1] += n1[2] * n1[0];
	n1[2] += n1[0] * n1[1];

	return n1;
}

export type Randomizer = (l: number, r: number, t?: number) => number;
export function randomizer(seed: number): Randomizer {
	let rndIdx = 100;
	return (l: number, r: number, t: number = 321) => {
		const n = rndIdx++ * 1000;
		const coord = [
			n + t * 10,
			n + seed / 10000,
			n
		] as Vector3;
		return pcg3d(coord)[0] * (r - l) + l;
	};
}
