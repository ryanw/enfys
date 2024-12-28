import { Quaternion } from ".";
import { conjugate, identity, inverse, multiply, quaternionFromEuler } from "./quaternions";

describe('quaternions', () => {
	test('creates an identity quaternion', () => {
		const quat = identity();
		expect(quat).toEqual([0, 0, 0, 1]);
	});

	test('creates a quaternion from euler angles', () => {
		let quat = quaternionFromEuler(0, 0.5, 0);
		expect(quat).toEqual([0, 0.24740395925452294, 0, 0.9689124217106447]);

		quat = quaternionFromEuler(0.5, 0.0, 0);
		expect(quat).toEqual([0.24740395925452294, 0, 0, 0.9689124217106447]);
	});

	test('multiplies quaternions together', () => {
		const q0 = quaternionFromEuler(0, 0.5, 0);
		const q1 = quaternionFromEuler(0, 0, 0.5);
		const q3 = multiply(q0, q1);
		expect(q3).toEqual([
			0.06120871905481365,
			0.2397127693021015,
			0.2397127693021015,
			0.9387912809451863,
		]);
	});

	test('calcualtes the conjugate', () => {
		const quat = [0.1, 0.2, 0.3, 0.4] as Quaternion;
		const result = conjugate(quat);
		expect(result).toEqual([-0.1, -0.2, -0.3, 0.4]);
	});

	test('calcualtes the inverse', () => {
		const quat = [0.1, 0.2, 0.3, 0.4] as Quaternion;
		const result = inverse(quat);
		expect(result).toEqual([
			0.18257418583505536,
			0.3651483716701107,
			0.5477225575051661,
			0.7302967433402214,
		]);
	});
});
