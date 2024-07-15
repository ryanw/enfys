import { Gfx, calculateNormals } from 'engine';
import { colorToBigInt, colorToInt, hsl } from 'engine/color';
import { Point3 } from 'engine/math';
import { rotation, transformPoint } from 'engine/math/transform';
import { add, scale } from 'engine/math/vectors';
import { ColorVertex, CUBE_VERTS, buildIcosahedron, PointVertex, buildIcosphere } from 'engine/mesh';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { buildSegment, jiggleVertices } from '.';

export class InsectsMesh extends VariantMesh {
	constructor(gfx: Gfx, readonly seed: number, variantCount: number = 32) {
		super(gfx, seed, variantCount);
	}

	generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 214;
		const rnd = randomizer(seed);
		const size = rnd(0.2, 1.0);

		const color = colorToBigInt(hsl(rnd(), rnd(0.4, 0.7), rnd(0.4, 0.7)));

		const toVertex = (position: Point3) => ({
			position,
			normal: [0, 0, 0],
			color,
		} as ColorVertex);

		const legThickness = 0.2;
		const legRes = 5;
		const vertices = [
			// Head
			buildIcosphere(0, p => toVertex(
				scale(add(p, [0, 1.5, 1.3]), [0.7, 0.7, 1.1]),
			)),
			// Thorax
			buildIcosphere(1, p => toVertex(
				scale(add(p, [0, 1.3, 0.0]), [0.8, 0.8, 1.1])
			)),
			// Abdomen
			buildIcosphere(1, p => toVertex(
				scale(add(p, [0, 1, -1]), [1, 1, 1.66])
			)),
			// Legs - Right
			buildSegment([0, 1, 0], [2, 1, 0], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([2, 1, 0], [3, 0, 0], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([0, 1, -1], [2, 1, -1], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([2, 1, -1], [3, 0, -1], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([0, 1, -2], [2, 1, -2], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([2, 1, -2], [3, 0, -2], legThickness, [legRes, 1]).map(toVertex),
			// Legs - Left
			buildSegment([-0, 1, 0], [-2, 1, 0], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([-2, 1, 0], [-3, 0, 0], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([-0, 1, -1], [-2, 1, -1], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([-2, 1, -1], [-3, 0, -1], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([-0, 1, -2], [-2, 1, -2], legThickness, [legRes, 1]).map(toVertex),
			buildSegment([-2, 1, -2], [-3, 0, -2], legThickness, [legRes, 1]).map(toVertex),
		].flat().map(v => ({ ...v, position: scale(v.position, size) }));

		//jiggleVertices(vertices, 1);
		calculateNormals(vertices);
		return vertices;
	}
}

