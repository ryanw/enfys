import { Vector3 } from "./math";

// http://www.jcgt.org/published/0009/03/02/
export function pcg3d(v: Vector3): Vector3 {
	let n  = v.map(i => i * 1664525 + 1013904223) as Vector3;

	n[0] += n[1] * n[2];
	n[1] += n[2] * n[0];
	n[2] += n[0] * n[1];

	n = n.map(i => ((i ^ (i >> 16)) / 0xffffffff) + 0.5) as Vector3;

	n[0] += n[1] * n[2];
	n[1] += n[2] * n[0];
	n[2] += n[0] * n[1];

	return n;
}
