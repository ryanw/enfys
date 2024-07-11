import { Gfx, calculateNormals } from 'engine';
import { ColorVertex, CUBE_VERTS } from 'engine/mesh';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { jiggleVertices } from '.';

export class TuftMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 7564;
		const rnd = randomizer(seed + 112233);
		const bt = 32;
		const spread = 1.0;
		const bladeCount = 4;
		const baseBlade: Array<ColorVertex> = CUBE_VERTS.map(p => ({
			position: [p[0] / bt, p[1], p[2] / bt],
			normal: [0, 0, 0],
			color: BigInt(0xff99dd66),
		}));
		calculateNormals(baseBlade);

		let vertices: Array<ColorVertex> = [];
		for (let i = 0; i < bladeCount; i++) {
			const x = rnd(-spread, spread);
			const y = rnd(0, -0.8);
			const z = rnd(-spread, spread);
			const blade = baseBlade.map(vertex => {
				const p = [...vertex.position];
				const position = [p[0] + x, p[1] + y, p[2] + z];
				return {
					...vertex,
					position
				} as ColorVertex;
			});
			vertices = [...vertices, ...blade];
		}
		jiggleVertices(vertices);
		calculateNormals(vertices);
		return vertices;
	}
}
