import { Quaternion } from '.';
import { magnitude, scale } from './vectors';

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

/**
 * Multiply quaternions together
 */
export function multiply(...quats: Array<Quaternion>): Quaternion {
	let result: Quaternion = [...quats[0]];
	for (let i = 1; i < quats.length; i++) {
		const q0 = result;
		const q1 = quats[i];
		const x = q0[3] * q1[0] + q0[0] * q1[3] + q0[1] * q1[2] - q0[2] * q1[1];
		const y = q0[3] * q1[1] - q0[0] * q1[2] + q0[1] * q1[3] + q0[2] * q1[0];
		const z = q0[3] * q1[2] + q0[0] * q1[1] - q0[1] * q1[0] + q0[2] * q1[3];
		const w = q0[3] * q1[3] - q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2];
		result = [x, y, z, w]
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

	const y = cr * cp * sy - sr * sp * cy;
	const x = cr * sp * cy + sr * cp * sy;
	const z = sr * cp * cy - cr * sp * sy;
	const w = cr * cp * cy + sr * sp * sy;

	return [x, y, z, w];
}
