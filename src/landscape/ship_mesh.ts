import { Color, Gfx, Size, calculateNormals } from "engine";
import { PHI, Point3 } from "engine/math";
import { CUBE_VERTS, ColorVertex, buildIcosahedron, Icosahedron, SimpleMesh, TextureVertex } from "engine/mesh";
import { TreePipeline } from "./pipelines/tree";

const { cos, sin } = Math;

export class ShipMesh extends SimpleMesh {
	constructor(gfx: Gfx) {
		const vertices: Array<ColorVertex> = buildShipMesh((position, i) => {
			let color: Color = [1, 0, 0, 1];
			// Every even triangle is on the top
			const isTop = (i/3|0) % 2 == 0;
			if (i < 3) {
				// First tri is the window
				color = [0, 0, 0, 1];
			}
			else if (isTop) {
				color = [0.6, 0.3, 0.9, 1];
			}
			else {
				color = [0.8, 0.7, 0.3, 1];
			}
			return {
				position: [...position],
				normal: [0, 0, 0],
				color,
			};
		});
		calculateNormals(vertices);
		super(gfx, vertices);
	}
}

function buildNGon(sides: number): Array<Point3> {
	const vertices: Point3[] = [];
	for (let i = 0; i < sides; i++) {
		const a = 2 * (Math.PI / sides) * i - Math.PI / 4;
		const x = sin(a);
		const y = cos(a);
		vertices.push([x, 0, y]);
	}

	const hull: Point3[] = [];
	for (let i = 0; i < vertices.length; i++) {
		// Add triangle on either side
		hull.push(
			vertices[i],
			vertices[(i + 1) % vertices.length],
			[0, 1.0 / PHI, 0],
		);
		hull.push(
			vertices[i],
			[0, -0.5 / PHI, 0],
			vertices[(i + 1) % vertices.length],
		);
	}
	return hull;
}

export function buildShipMesh<T>(callback: (position: Point3, index: number) => T): Array<T> {
	const hull = buildNGon(5);
	return hull.map(callback);
}

