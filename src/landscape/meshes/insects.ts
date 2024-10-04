import { Gfx, calculateNormals } from 'engine';
import { colorToBigInt, hsl } from 'engine/color';
import { Point3 } from 'engine/math';
import { add, scale } from 'engine/math/vectors';
import { ColorVertex, buildIcosphere } from 'engine/mesh';
import { random, randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { buildSegment, jiggleVertices } from '.';

export class InsectsMesh extends VariantMesh {
	constructor(gfx: Gfx, readonly seed: number, variantCount: number = 32) {
		super(gfx, seed, variantCount);
		this.resizeInstanceCapacity(4096);
	}

	generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 214;
		const rnd = randomizer(seed);
		const size = rnd(0.2, 1.0);

		const bodyHue = rnd();
		const legHue = bodyHue;

		const toHeadVertex = (position: Point3): ColorVertex => ({
			softness: 0,
			position,
			normal: [0, 0, 0],
			color: colorToBigInt(hsl(bodyHue, 0.7, 0.6)),
		});

		const toBodyVertex = (position: Point3): ColorVertex => ({
			softness: 0,
			position,
			normal: [0, 0, 0],
			color: colorToBigInt(hsl(bodyHue, 0.5, 0.4)),
		});

		const toLegsVertex = (position: Point3): ColorVertex => ({
			softness: 0,
			position,
			normal: [0, 0, 0],
			color: colorToBigInt(hsl(legHue, 0.3, 0.3)),
		});

		const legThickness = 0.15;
		const legRes: [number, number] = [5, 3];
		const legLen = 2;
		const legHip = 1.2;
		const legFoot = -0.5;
		const vertices = [
			// Head
			buildIcosphere(1, p => toHeadVertex(
				scale(add(p, [0, 1.3, 0.0]), [0.8, 0.8, 1.1])
			)),
			// Body
			buildIcosphere(1, p => toBodyVertex(
				scale(add(p, [0, 1, -1]), [1, 1, 1.66])
			)),
			// Legs - Right
			buildSegment([0.5, legHip, 0], [legLen, legFoot, 0], legThickness, legRes).map(toLegsVertex),
			buildSegment([0.5, legHip, -1], [legLen, legFoot, -1], legThickness, legRes).map(toLegsVertex),
			buildSegment([0.5, legHip, -2], [legLen, legFoot, -2], legThickness, legRes).map(toLegsVertex),
			// Legs - Left
			buildSegment([-0.5, legHip, 0], [-legLen, legFoot, 0], legThickness, legRes).map(toLegsVertex),
			buildSegment([-0.5, legHip, -1], [-legLen, legFoot, -1], legThickness, legRes).map(toLegsVertex),
			buildSegment([-0.5, legHip, -2], [-legLen, legFoot, -2], legThickness, legRes).map(toLegsVertex),
		].flat().map(v => ({ ...v, position: scale(v.position, size) }));

		//jiggleVertices(vertices, 2 * size);
		calculateNormals(vertices);
		return vertices;
	}
}

