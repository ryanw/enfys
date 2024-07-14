import { calculateNormals } from 'engine';
import { ColorVertex, buildIcosphere } from 'engine/mesh';
import { jiggleVertices } from '.';
import { VariantMesh } from './variant';
import { scale } from 'engine/math/vectors';
import { randomizer } from 'engine/noise';

export class RockMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 342;
		const rnd = randomizer(seed);
		const rockSize = rnd(0.2, 1.0);
		const vertices = buildIcosphere(1, p => ({
			position: scale(p, rockSize),
			normal: [0, 0, 0],
			color: BigInt(0xff445566),
		} as ColorVertex));
		jiggleVertices(vertices, 3 * rockSize, seed);
		calculateNormals(vertices);
		return vertices;
	}
}
