import { calculateNormals } from 'engine';
import { colorToInt, hsl } from 'engine/color';
import { Point3 } from 'engine/math';
import { rotation, transformPoint } from 'engine/math/transform';
import { add, scale } from 'engine/math/vectors';
import { ColorVertex, buildCylinder } from 'engine/mesh';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { jiggleVertices } from '.';
import { buildIcosahedron } from 'engine/meshes/icosahedron';

export class FlowersMesh extends VariantMesh {
	generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 32145;
		const { PI, min } = Math;
		const rnd = randomizer(seed);
		const maxPetalCount = 12;

		const diskHue = rnd();
		const petalHue = rnd();
		const stalkHue = rnd(0.1, 0.4);
		const petalCount = rnd(3, maxPetalCount) | 0;

		const diskRad = rnd(0.1, 0.3);
		const petalRad = diskRad + rnd(0.1, 0.3);
		const stalkWidth = rnd(min(0.03, diskRad / 4), diskRad / 4);
		const stalkHeight = rnd(0.6, 1.2);

		const petalColor = BigInt(colorToInt(hsl(petalHue, 0.7, 0.5)));
		const diskColor = BigInt(colorToInt(hsl(diskHue, 0.7, 0.5)));
		const stalkColor = BigInt(colorToInt(hsl(stalkHue, 0.7, 0.5)));

		const getSoftness = (p: Point3) => Math.pow(p[1], 2);

		const stalk = buildCylinder(stalkHeight, stalkWidth, [4, 4]).map(p => {
			const position = add<Point3>(p, [0, stalkHeight / 2, 0]);
			return ({
				position,
				softness: getSoftness(position),
				normal: [0, 0, 0],
				color: stalkColor,
			} as ColorVertex)
		});

		const disk = buildIcosahedron(p => {
			const position = add<Point3>(scale(p, diskRad), [0, stalkHeight, 0]);
			return ({
				softness: getSoftness(position),
				position,
				normal: [0, 0, 0],
				color: diskColor,
			} as ColorVertex)
		});

		const petal = buildIcosahedron(p => {
			const position = add<Point3>(
				[p[0] * petalRad, p[1] / 10, p[2] * petalRad / 2],
				[petalRad, stalkHeight, 0],
			);
			return ({
				softness: getSoftness(position),
				position,
				normal: [0, 0, 0],
				color: petalColor,
			} as ColorVertex)
		});

		const vertices = [...stalk, ...disk];

		const a = PI * 2 / petalCount;
		const nullPoint: Point3 = [0, 0, 0];
		for (let i = 0; i < maxPetalCount; i++) {
			const rot = rotation(0, a * i, 0);
			for (const vertex of petal) {
				const position = i < petalCount ? transformPoint(rot, vertex.position) : nullPoint;
				vertices.push({
					...vertex,
					softness: getSoftness(position),
					position,
				});
			}
		}
		jiggleVertices(vertices);
		calculateNormals(vertices);
		return vertices;
	}
}

