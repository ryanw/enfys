import { Gfx, calculateNormals } from 'engine';
import { ColorVertex, buildCylinder } from 'engine/mesh';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { jiggleVertices } from '.';
import { add } from 'engine/math/vectors';
import { colorToInt, hsl } from 'engine/color';
import { Point3 } from 'engine/math';
import { multiply, rotation, scaling, transformPoint } from 'engine/math/transform';
import { smoothstep } from 'engine/helpers';

export class TuftMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 7564;
		const rnd = randomizer(seed + 112233);
		const spread = 1.2;
		const bladeCount = 32;

		const color = colorToInt(hsl(rnd(), rnd(0.4, 0.7), rnd(0.4, 0.7)));
		const getSoftness = (p: Point3) => Math.pow(p[1], 2);

		let vertices: Array<ColorVertex> = [];
		for (let i = 0; i < bladeCount; i++) {
			const height = rnd(0.3, 2.0);
			const radius = rnd(0.01, 0.08);

			const x = rnd(-spread, spread);
			const y = height / 2 - 0.3;
			const z = rnd(-spread, spread);
			const rot = rotation(0, rnd(-Math.PI, Math.PI), 0);

			const blade: Array<ColorVertex> = buildCylinder(height, radius, [2, 3]).map(p => {
				const s = 1.0 - smoothstep(0.1, 0.5, p[1]/height);
				const h = scaling(s, 1, s);
				const position = add<Point3>(transformPoint(multiply(rot, h), p), [x, y, z]);
				return ({
					softness: getSoftness(position),
					position,
					normal: [0, 0, 0],
					color: BigInt(color),
				})
			});

			vertices = [...vertices, ...blade];
		}
		//jiggleVertices(vertices);
		calculateNormals(vertices);
		return vertices;
	}
}
