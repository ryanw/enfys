import { Gfx, calculateNormals } from 'engine';
import { ColorVertex, buildCylinder } from 'engine/mesh';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { jiggleVertices } from '.';
import { add } from 'engine/math/vectors';
import { colorToInt, hsl } from 'engine/color';

export class TuftMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 7564;
		const rnd = randomizer(seed + 112233);
		const spread = 0.8;
		const bladeCount = 3;

		const color = colorToInt(hsl(rnd(), rnd(0.4, 0.7), rnd(0.4, 0.7)));

		let vertices: Array<ColorVertex> = [];
		for (let i = 0; i < bladeCount; i++) {
			const height = rnd(0.3, 2.0);
			const radius = rnd(0.01, 0.08);

			const x = rnd(-spread, spread);
			const y = height / 2 - 0.3;
			const z = rnd(-spread, spread);

			const blade: Array<ColorVertex> = buildCylinder(height, radius, [3, 4]).map(position => ({
				position: add(position, [x, y, z]),
				normal: [0, 0, 0],
				color: BigInt(color),
			}));

			vertices = [...vertices, ...blade];
		}
		jiggleVertices(vertices);
		calculateNormals(vertices);
		return vertices;
	}
}
