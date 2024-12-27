import { Gfx, calculateNormals, subdivideFace } from 'engine';
import { normalize } from '../math/vectors';
import { BuildCallback, ColorInstance, ColorVertex, SimpleMesh } from 'engine/mesh';
import { ICOSAHEDRON_TRIS, ICOSAHEDRON_VERTICES } from './icosahedron';


/**
 * Sphere Mesh created from subdivided icosahedron
 */
export class CubeSphere extends SimpleMesh {
	constructor(gfx: Gfx, divisions: number, instances?: Array<ColorInstance>) {
		const vertices = buildCubeSphere(
			divisions,
			position => ({
				softness: 0.0,
				position: [...position],
				normal: [0, 0, 0],
				color: BigInt(0xffffffff),
			} as ColorVertex),
		);
		calculateNormals(vertices);
		super(gfx, vertices, instances);
	}
}

export class InnerCubeSphere extends SimpleMesh {
	constructor(gfx: Gfx, divisions: number, instances?: Array<ColorInstance>) {
		const vertices = buildCubeSphere(
			divisions,
			true,
			position => ({
				softness: 0.0,
				position: [...position],
				normal: [0, 0, 0],
				color: BigInt(0xffffffff),
			} as ColorVertex),
		);
		calculateNormals(vertices);
		super(gfx, vertices, instances);
	}
}

export function buildCubeSphere<T>(divisions: number, invert: boolean, callback: BuildCallback<T>): Array<T>;
export function buildCubeSphere<T>(divisions: number, callback: BuildCallback<T>): Array<T>;
export function buildCubeSphere<T>(divisions: number, invertOrCallback: boolean | BuildCallback<T>, maybeCallback?: BuildCallback<T>): Array<T> {
	const [invert, callback] = typeof invertOrCallback === 'boolean'
		? [invertOrCallback, maybeCallback]
		: [false, invertOrCallback];

	const vertices = ICOSAHEDRON_TRIS.map(
		([v0, v1, v2]) => {
			const p0 = ICOSAHEDRON_VERTICES[invert ? v0 : v0];
			const p1 = ICOSAHEDRON_VERTICES[invert ? v2 : v1];
			const p2 = ICOSAHEDRON_VERTICES[invert ? v1 : v2];
			return subdivideFace([p0, p1, p2], divisions)
				.map(face => face
					.map((p, i) =>
						callback!(normalize(p), i)
					)
				);
		}).flat().flat();

	return vertices;
}
