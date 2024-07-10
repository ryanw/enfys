import { BigVector3, Point3, Vector3 } from './math';

// http://www.jcgt.org/published/0009/03/02/
export function pcg3d(v: Vector3): Vector3 {
	let n0  = v.map(i => BigInt(i * 1664525 | 0) + BigInt(1013904223)) as BigVector3;

	n0[0] += n0[1] * n0[2];
	n0[1] += n0[2] * n0[0];
	n0[2] += n0[0] * n0[1];

	n0 = n0.map(v => v % BigInt(0xffffffff)) as BigVector3;

	const n1 = n0.map(i => Number(i ^ (i >> BigInt(16))) * (1.0 / 0xffffffff)) as Vector3;

	n1[0] += n1[1] * n1[2];
	n1[1] += n1[2] * n1[0];
	n1[2] += n1[0] * n1[1];

	return n1;
}

export type Randomizer = (l?: number, r?: number) => number;
export function randomizer(seed: number, p: Point3 = [0, 0, 0]): Randomizer {
	let rndIdx = 100;
	return (l: number = 0, r: number = 1) => {
		const n = rndIdx++ * 1000;
		const coord = [
			p[0] + n,
			p[1] + n + seed / 10000,
			p[2] + n
		] as Vector3;
		return (pcg3d(coord)[0] % 1) * (r - l) + l;
	};
}
