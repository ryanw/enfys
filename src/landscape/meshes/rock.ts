import { Gfx, calculateNormals } from 'engine';
import { ColorVertex, SimpleMesh, buildIcosahedron } from 'engine/mesh';

export class RockMesh extends SimpleMesh {
	constructor(gfx: Gfx) {
		const vertices = buildIcosahedron(p => ({
			position: [...p],
			normal: [0, 0, 0],
			color: BigInt(0xff445566),
		} as ColorVertex));
		calculateNormals(vertices);
		super(gfx, vertices);
	}
}
