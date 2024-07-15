import { Gfx, calculateNormals } from 'engine';
import { colorToBigInt, colorToInt, hsl } from 'engine/color';
import { Point3 } from 'engine/math';
import { rotation, transformPoint } from 'engine/math/transform';
import { add, scale } from 'engine/math/vectors';
import { ColorVertex, CUBE_VERTS, buildIcosahedron, PointVertex, buildIcosphere } from 'engine/mesh';
import { pcg3d, random, randomizer } from 'engine/noise';
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

		const headHue = rnd();
		const bodyHue = rnd();
		const legsHue = rnd();
		const rndColor = (h: number, p: Point3) => {
			const s = random(seed, p, 0.5, 0.8);
			const l = random(seed, p, 0.3, 0.6);
			return colorToBigInt(hsl(h, s, l));
		};

		const toHeadVertex = (position: Point3): ColorVertex => ({
			position,
			normal: [0, 0, 0],
			color: rndColor(headHue, position),
		});

		const toBodyVertex = (position: Point3): ColorVertex => ({
			position,
			normal: [0, 0, 0],
			color: rndColor(bodyHue, position),
		});

		const toLegsVertex = (position: Point3): ColorVertex => ({
			position,
			normal: [0, 0, 0],
			color: rndColor(legsHue, position),
		});

		const legThickness = 0.2;
		const legRes = 5;
		const vertices = [
			// Head
			buildIcosphere(0, p => toHeadVertex(
				scale(add(p, [0, 1.5, 1.3]), [0.7, 0.7, 1.1]),
			)),
			// Thorax
			buildIcosphere(1, p => toBodyVertex(
				scale(add(p, [0, 1.3, 0.0]), [0.8, 0.8, 1.1])
			)),
			// Abdomen
			buildIcosphere(1, p => toBodyVertex(
				scale(add(p, [0, 1, -1]), [1, 1, 1.66])
			)),
			// Legs - Right
			buildSegment([0, 1, 0], [2, 1, 0], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([2, 1, 0], [3, 0, 0], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([0, 1, -1], [2, 1, -1], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([2, 1, -1], [3, 0, -1], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([0, 1, -2], [2, 1, -2], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([2, 1, -2], [3, 0, -2], legThickness, [legRes, 1]).map(toLegsVertex),
			// Legs - Left
			buildSegment([-0, 1, 0], [-2, 1, 0], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([-2, 1, 0], [-3, 0, 0], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([-0, 1, -1], [-2, 1, -1], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([-2, 1, -1], [-3, 0, -1], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([-0, 1, -2], [-2, 1, -2], legThickness, [legRes, 1]).map(toLegsVertex),
			buildSegment([-2, 1, -2], [-3, 0, -2], legThickness, [legRes, 1]).map(toLegsVertex),
		].flat().map(v => ({ ...v, position: scale(v.position, size) }));

		jiggleVertices(vertices, 2 * size);
		calculateNormals(vertices);
		return vertices;
	}
}

