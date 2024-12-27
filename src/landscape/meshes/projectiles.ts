import { calculateNormals } from 'engine';
import { ColorVertex, buildCylinder } from 'engine/mesh';
import { VariantMesh } from './variant';
import { add, scale } from 'engine/math/vectors';
import { randomizer } from 'engine/noise';
import { multiply, rotation, transformPoint, translation } from 'engine/math/transform';
import { Point3, Vector3 } from 'engine/math';
import { buildIcosphere } from 'engine/meshes/icosphere';

export class BombMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 342;
		const rnd = randomizer(seed);
		const size = rnd(0.2, 1.0);
		const vertices = buildIcosphere(0, p => ({
			softness: 0,
			position: scale(p, size),
			normal: [0, 0, 0],
			color: BigInt(0xff4455cc),
		} as ColorVertex));
		calculateNormals(vertices);
		return vertices;
	}
}

export class LaserMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const length = 8;
		const seed = this.seed + i * 342;
		const rnd = randomizer(seed);
		const size = rnd(0.2, 1.0);
		const transform = multiply(
			translation(0, 0, length / 2),
			rotation(Math.PI / 2, 0, 0),
		);
		function offset(p: Point3): Vector3 {
			const { sin, cos } = Math;
			const size = 0.3;
			const z = p[1] * 2.0;
			return [sin(z) * size, 0, cos(z) * size];
		}

		const vertices = buildCylinder(length, 0.25, [3, 8])
			.map(position => ({
				softness: 0,
				position: scale(transformPoint(transform, add(position, offset(position))), size),
				normal: [0, 0, 0],
				color: BigInt(0xffeeaa11),
			} as ColorVertex));
		calculateNormals(vertices);
		return vertices;
	}
}
