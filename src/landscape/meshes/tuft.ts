import { Gfx, calculateNormals } from "engine";
import { ColorVertex, SimpleMesh, CUBE_VERTS } from "engine/mesh";
import { randomizer } from "engine/noise";

export class TuftMesh extends SimpleMesh {
	constructor(gfx: Gfx, seed: number, count: number = 4) {
		const rnd = randomizer(seed + 112233);
		const bt = 32;
		const spread = 1.0;
		const baseBlade: Array<ColorVertex> = CUBE_VERTS.map(p => ({
			position: [p[0] / bt, p[1], p[2] / bt],
			normal: [0, 0, 0],
			color: BigInt(0xff99dd66),
		}));
		calculateNormals(baseBlade);

		let vertices: Array<ColorVertex> = [];
		for (let i = 0; i < count; i++) {
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
		calculateNormals(vertices);
		super(gfx, vertices);
	}
}
