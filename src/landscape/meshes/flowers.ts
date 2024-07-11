import { Gfx, calculateNormals } from 'engine';
import { colorToInt, hsl } from 'engine/color';
import { Point3 } from 'engine/math';
import { rotation, transformPoint } from 'engine/math/transform';
import { add, scale } from 'engine/math/vectors';
import { ColorVertex, CUBE_VERTS, buildIcosahedron, PointVertex } from 'engine/mesh';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { jiggleVertices } from '.';

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
		const stalkHeight = rnd(0.3, 1.2);

		const petalColor = BigInt(colorToInt(hsl(petalHue, 0.7, 0.5)));
		const diskColor = BigInt(colorToInt(hsl(diskHue, 0.7, 0.5)));
		const stalkColor = BigInt(colorToInt(hsl(stalkHue, 0.7, 0.5)));

		const stalk = CUBE_VERTS.map(p => ({
			position: [
				p[0] * stalkWidth,
				p[1] * stalkHeight,
				p[2] * stalkWidth,
			],
			normal: [0, 0, 0],
			color: stalkColor,
		} as ColorVertex));

		const disk = buildIcosahedron(p => ({
			position: add(scale(p, diskRad), [0, stalkHeight, 0]),
			normal: [0, 0, 0],
			color: diskColor,
		} as ColorVertex));

		const petal = buildIcosahedron(p => ({
			position: add(
				[p[0] * petalRad, p[1] / 10, p[2] * petalRad / 2],
				[petalRad, stalkHeight, 0],
			),
			normal: [0, 0, 0],
			color: petalColor,
		} as ColorVertex));

		const vertices = [...stalk, ...disk];

		const a = PI * 2 / petalCount;
		const nullPoint: Point3 = [0, 0, 0];
		for (let i = 0; i < maxPetalCount; i++) {
			const rot = rotation(0, a * i, 0);
			for (const vertex of petal) {
				vertices.push({
					...vertex,
					position: i < petalCount ? transformPoint(rot, vertex.position) : nullPoint,
				});
			}
		}
		jiggleVertices(vertices);
		calculateNormals(vertices);
		return vertices;
	}
}

