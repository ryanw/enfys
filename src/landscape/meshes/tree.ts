import { calculateNormals } from 'engine';
import { Point3, Vector2 } from 'engine/math';
import { ColorVertex, buildIcosahedron, buildIcosphere } from 'engine/mesh';
import { add } from 'engine/math/vectors';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { jiggleVertices } from '.';

export class TreeMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 3121;
		const rnd = randomizer(seed);
		let vertices: ColorVertex[] = [];

		const trunkThickness = rnd(1.0, 1.3);
		const trunkHeight = 8;
		const trunkRad = 0.5;
		const trunkDiv = [7, 8] as [number, number];
		const trunk = buildCylinder(trunkHeight, trunkRad, trunkDiv).map(position => {
			const offset = [0, trunkHeight / 2.2, 0];
			const p = add(position, offset);
			p[0] *= trunkThickness;
			p[2] *= trunkThickness;
			return {
				position: p,
				normal: [0, 0, 0],
				color: BigInt(0xff20689a),
			} as ColorVertex;
		});
		jiggleVertices(trunk, 2, seed);
		const bush = buildBush().map((position: Point3) => {
			return {
				position,
				normal: [0, 0, 0],
				color: BigInt(0xff209a68),
			} as ColorVertex;
		});
		jiggleVertices(bush, 16, seed);
		vertices = [...trunk, ...bush];

		calculateNormals(vertices);
		return vertices;
	}
}

function buildBush(): Array<Point3> {
	const bush: Point3[] = buildIcosphere(1, (p: Point3) => [
		p[0] * 5.0,
		p[1] * 5.0 + 9.0,
		p[2] * 5.0,
	]);
	return bush;
}

function buildCylinder(
	length: number,
	radius: number,
	divisions: [number, number],
): Array<Point3> {
	const [rd, hd] = divisions;

	const topCap = buildDisc(radius, rd).map<Point3>(p => add(p, [0, 0.5, 0]));
	const botCap = flipFaces(buildDisc(radius, rd).map<Point3>(p => add(p, [0, -0.5, 0])));

	const vertices = [...topCap, ...botCap,];

	for (let i = 0; i < rd; i++) {
		const x = i * 3;
		const y = x + 1;
		const d: Vector2 = [
			(topCap[x][1] - botCap[y][1]) / hd,
			(topCap[y][1] - botCap[x][1]) / hd,
		];
		for (let j = 0; j < hd; j++) {
			const oy = (1 / hd) * j;

			const tri0: Point3[] = [
				add(botCap[x], [0, d[1] + oy, 0]),
				add(botCap[y], [0, d[0] + oy, 0]),
				add(botCap[x], [0, oy, 0]),
			];
			const tri1: Point3[] = [
				add(botCap[y], [0, d[0] + oy, 0]),
				add(botCap[y], [0, oy, 0]),
				add(botCap[x], [0, oy, 0]),
			];

			vertices.push(...tri0);
			vertices.push(...tri1);
		}
	}


	return vertices.map(p => [p[0], p[1] * length, p[2]]);
}

function buildDisc(radius: number, divisions: number): Point3[] {
	const { cos, sin } = Math;

	const vertices: Point3[] = [];
	const div = (Math.PI * 2) / divisions;
	for (let i = 0; i < divisions + 1; i++) {
		const a0 = div * i;
		const a1 = div * (i + 1);
		const p0: Point3 = [cos(a1) * radius, 0, sin(a1) * radius];
		const p1: Point3 = [cos(a0) * radius, 0, sin(a0) * radius];
		const p2: Point3 = [0, 0, 0];
		vertices.push(p0, p1, p2);
	}
	return vertices;
}

function flipFaces(faces: Point3[]): Point3[] {
	const flipped = new Array(faces.length);
	for (let i = 0; i < faces.length - 2; i += 3) {
		flipped[i + 0] = (faces[i + 1]);
		flipped[i + 1] = (faces[i + 0]);
		flipped[i + 2] = (faces[i + 2]);
	}
	return flipped;
}
