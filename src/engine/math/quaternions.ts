import { Quaternion, Vector3, Vector4 } from '.';
import * as transform from './transform';
import { magnitude, normalize, scale } from './vectors';

/**
 * Create an identity Quaternion
 */
export function identity(): Quaternion {
	return [0, 0, 0, 1];
}

/**
 * Conjugate of a quaternion
 */
export function conjugate([x, y, z, w]: Quaternion): Quaternion {
	return [-x, -y, -z, w];
}

/**
 * Inverse of a quaternion
 */
export function inverse(quat: Quaternion): Quaternion {
	const mag = magnitude(quat);
	return scale(quat, 1 / mag);
}

export function quaternionFromAxisAngle(axis: Vector3, angle: number): Quaternion {
	axis = normalize(axis);

	const halfAngle = angle / 2;
	const sinHalfAngle = Math.sin(halfAngle);
	const cosHalfAngle = Math.cos(halfAngle);

	const x = axis[0] * sinHalfAngle;
	const y = axis[1] * sinHalfAngle;
	const z = axis[2] * sinHalfAngle;
	const w = cosHalfAngle;

	return [x, y, z, w];
}

export function multiplyVector<T extends Vector3 | Vector4>(quat: Quaternion, vec: T): T {
	const rot = transform.rotationFromQuaternion(quat);
	return transform.multiplyVector(rot, vec);
}

/**
 * Multiply quaternions together
 */
export function multiply(...quats: Array<Quaternion>): Quaternion {
	if (quats.length === 0) throw new Error("Must provide at least 1 quaternion");

	let result: Quaternion = [...quats[0]];
	for (let i = 1; i < quats.length; i++) {
		const q0 = result;
		const q1 = quats[i];
		const x = q0[3] * q1[0] + q0[0] * q1[3] + q0[1] * q1[2] - q0[2] * q1[1];
		const y = q0[3] * q1[1] - q0[0] * q1[2] + q0[1] * q1[3] + q0[2] * q1[0];
		const z = q0[3] * q1[2] + q0[0] * q1[1] - q0[1] * q1[0] + q0[2] * q1[3];
		const w = q0[3] * q1[3] - q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2];
		result = [x, y, z, w];
	}
	return result;
}

/**
 * Test if a quaternion is a normalized
 */
export function isUnitQuaternion(quat: Quaternion): boolean {
	return magnitude(quat) === 1;
}

/**
 * Create a quaternion from euler angles
 */
export function quaternionFromEuler(pitch: number, yaw: number, roll: number): Quaternion {
	const { cos, sin } = Math;

	const cp = cos(pitch / 2);
	const sp = sin(pitch / 2);
	const cy = cos(yaw / 2);
	const sy = sin(yaw / 2);
	const cr = cos(roll / 2);
	const sr = sin(roll / 2);

	const w = cr * cp * cy + sr * sp * sy;
	const x = cr * sp * cy + sr * cp * sy;
	const y = cr * cp * sy - sr * sp * cy;
	const z = sr * cp * cy - cr * sp * sy;

	return [x, y, z, w];
}


/**
 * Convert a Quaternion into Euler angles
 */
export function quaternionToEuler([x, y, z, w]: Quaternion): Vector3 {
	const { min, max, asin, atan2 } = Math;
	const t0 = 2 * (w * x + y * z);
	const t1 = 1 - 2 * (x * x + y * y);
	const roll = atan2(t0, t1);

	const t2 = min(1, max(-1, 2 * (w * y - z * x)));
	const pitch = asin(t2)

	const t3 = 2 * (w * z + x * y)
	const t4 = 1 - 2 * (y * y + z * z)
	const yaw = atan2(t3, t4)

	return [pitch, yaw, roll];
}

export function lerp(q0: Quaternion, q1: Quaternion, t: number): Quaternion {
	const { min, max } = Math;
	t = max(0, min(1, t));

	const result = [
		(1 - t) * q0[0] + t * q1[0], // x
		(1 - t) * q0[1] + t * q1[1], // y
		(1 - t) * q0[2] + t * q1[2], // z
		(1 - t) * q0[3] + t * q1[3], // w
	];

	return normalize(result) as Quaternion;
}
