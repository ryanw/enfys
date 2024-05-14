import { Gfx, Size, calculateNormals } from 'engine';
import { PHI, Point2, Point3, Vector3 } from './math';
import { add, cross, normalize, scale, subtract } from './math/vectors';
import { multiply } from './math/transform';

/**
 * Enforces all properties on a Vertex to be `number` or `Array<number>`
 */
export type Vertex<T> = {
	[K in keyof T]: T[K] extends (Array<number> | number) ? T[K] : never;
}

/**
 * Vertex with a position in 3D space
 */
export interface PointVertex {
	position: Point3,
};

/**
 * Vertex with a surface normal
 */
export interface NormalVertex extends PointVertex {
	normal: Vector3
}

/**
 * Vertex that can be used to draw textured polygons
 */
export interface TextureVertex extends NormalVertex {
	uv: Point2,
}



/**
 * Collection of Vertices representing some kind of 3D geometry.
 * @typeParm V - Type of the vertices in this mesh
 */
export class Mesh<V extends Vertex<V>> {
	// Matches the `in: VertexIn` order
	attributeOrder: Array<keyof V> = [];
	buffer!: GPUBuffer;
	vertexCount: number = 0;

	/**
	 * @param vertices Array of Vertices
	 */
	constructor(readonly gfx: Gfx, vertices: Array<V> = []) {
		if (vertices.length > 0) {
			this.uploadVertices(vertices);
		}
	}

	uploadVertices(vertices: Array<V>) {
		if (vertices.length < 1) {
			throw new Error('Mesh must have at least 1 vertex');
		}
		const { device } = this.gfx;
		const keys = this.attributeOrder.length === 0
			? Object.keys(vertices[0]).sort() as Array<keyof V>
			: this.attributeOrder;

		const data = toArrayBuffer(vertices, keys);
		const buffer = device.createBuffer({
			label: 'Mesh Attribute Buffer',
			size: data.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});
		device.queue.writeBuffer(buffer, 0, data);

		this.vertexCount = vertices.length;
		this.buffer = buffer;
	}
}

/**
 * Mesh made of {@link TextureVertex} vertices
 */
export class SimpleMesh extends Mesh<TextureVertex> {
	attributeOrder: Array<keyof TextureVertex> = ['position', 'normal', 'uv'];
	constructor(gfx: Gfx, vertices: Array<TextureVertex>) {
		super(gfx);
		this.uploadVertices(vertices);
	}
}


/**
 * Convert the Mesh into a single `ArrayBuffer`, each vertex attribute is interleaved.
 * Assumes all numbers are floats
 * @return Float32Array containing the ArrayBuffer Vertex attribute data
 */
function toArrayBuffer<V extends Vertex<V>>(vertices: Array<V>, attributes: Array<keyof V>): Float32Array {
	if (vertices.length === 0) return new Float32Array();

	let vertexSize = 0;
	const proto = vertices[0];
	for (const key of attributes) {
		const prop = proto[key];
		if (Array.isArray(prop)) {
			vertexSize += prop.length;
		}
		else {
			vertexSize += 1;
		}
	}
	const size = vertexSize * vertices.length;
	const data = new Float32Array(size);

	// Copy data into array
	let offset = 0;
	for (let i = 0; i < vertices.length; i++) {
		const vertex = vertices[i];
		for (const key of attributes) {
			const prop = vertex[key];
			if (!prop) continue;

			if (Array.isArray(prop)) {
				data.set(prop, offset);
				offset += prop.length;
			} else if (typeof prop === 'number') {
				data.set([prop], offset);
				offset += 1;
			}

		}
	}

	return data;
}

function toVertex(position: Point3): TextureVertex {
	return {
		position: [...position],
		normal: [0, 0, 0],
		uv: [0, 0]
	}
}

/**
 * Mesh shaped like a flat subdivided plane
 */
export class QuadMesh extends SimpleMesh {
	constructor(gfx: Gfx, divisions: [number, number], size: Size = [1, 1]) {
		const s0 = (1 / (divisions[0] + 1)) * size[0];
		const s1 = (1 / (divisions[1] + 1)) * size[1];
		const quad: Array<Point3> = [
			[-s0, 0, s1],
			[s0, 0, s1],
			[s0, 0, -s1],

			[-s0, 0, s1],
			[s0, 0, -s1],
			[-s0, 0, -s1],
		];

		let subquad: Array<Point3> = [];

		const gap = 0.0;
		const stepX = s0 * 2 + gap;
		const stepY = s1 * 2 + gap;
		const offset = [
			-s0 * divisions[0],
			-s1 * divisions[1],
		];
		for (let y = 0; y <= divisions[1]; y++) {
			for (let x = 0; x <= divisions[0]; x++) {
				const nextQuad: Array<Point3> =
					quad.map(p => add(p, [
						stepX * x + offset[0],
						0,
						stepY * y + offset[1],
					]));
				subquad = subquad.concat(nextQuad);
			}
		}

		const vertices = subquad.map(toVertex);

		calculateNormals(vertices);
		super(gfx, vertices);
	}
}

/**
 * Mesh shaped like an Cube
 */
export class Cube extends SimpleMesh {
	constructor(gfx: Gfx) {
		const vertices = CUBE_VERTS.map(toVertex);
		calculateNormals(vertices);
		super(gfx, vertices);
	}
}

/**
 * Mesh shaped like an Icosahedron
 */
export class Icosahedron extends SimpleMesh {
	constructor(gfx: Gfx) {
		const vertices = buildIcosahedron(position => ({
			position: [...position],
			normal: [0, 0, 0],
			uv: [0, 0]
		} as TextureVertex));
		calculateNormals(vertices);
		super(gfx, vertices);
	}
}


export function buildIcosahedron<T>(callback: (position: Point3, index: number) => T): Array<T> {
	return ICOSAHEDRON_TRIS.map(
		(tri) => tri.map(
			(v, i) =>
				callback(normalize(ICOSAHEDRON_VERTICES[v]), i)
		)
	).flat();
}

const CUBE_VERTS: Array<Point3> = [
	[-1, -1, 1],
	[1, -1, 1],
	[1, 1, 1],

	[-1, -1, 1],
	[1, 1, 1],
	[-1, 1, 1],

	[1, -1, 1],
	[1, -1, -1],
	[1, 1, -1],

	[1, -1, 1],
	[1, 1, -1],
	[1, 1, 1],

	[1, -1, -1],
	[-1, -1, -1],
	[-1, 1, -1],

	[1, -1, -1],
	[-1, 1, -1],
	[1, 1, -1],

	[-1, -1, -1],
	[-1, -1, 1],
	[-1, 1, 1],

	[-1, -1, -1],
	[-1, 1, 1],
	[-1, 1, -1],

	[-1, 1, 1],
	[1, 1, 1],
	[1, 1, -1],

	[-1, 1, 1],
	[1, 1, -1],
	[-1, 1, -1],

	[1, -1, 1],
	[-1, -1, -1],
	[1, -1, -1],

	[1, -1, 1],
	[-1, -1, 1],
	[-1, -1, -1]
];

const ICOSAHEDRON_VERTICES: Array<Point3> = [
	[-1, PHI, 0],
	[1, PHI, 0],
	[-1, -PHI, 0],
	[1, -PHI, 0],
	[0, -1, PHI],
	[0, 1, PHI],
	[0, -1, -PHI],
	[0, 1, -PHI],
	[PHI, 0, -1],
	[PHI, 0, 1],
	[-PHI, 0, -1],
	[-PHI, 0, 1]
];

const ICOSAHEDRON_TRIS: Array<[number, number, number]> = [
	[0, 11, 5],
	[0, 5, 1],
	[0, 1, 7],
	[0, 7, 10],
	[0, 10, 11],
	[1, 5, 9],
	[5, 11, 4],
	[11, 10, 2],
	[10, 7, 6],
	[7, 1, 8],
	[3, 9, 4],
	[3, 4, 2],
	[3, 2, 6],
	[3, 6, 8],
	[3, 8, 9],
	[4, 9, 5],
	[2, 4, 11],
	[6, 2, 10],
	[8, 6, 7],
	[9, 8, 1],
];

const ICOSAHEDRON_LINES: Array<[number, number]> = [
	// Top
	[0, 11],
	[0, 5],
	[0, 1],
	[0, 7],
	[0, 10],
	[1, 5],
	[5, 11],
	[11, 10],
	[10, 7],
	[7, 1],

	// Bottom
	[3, 9],
	[3, 4],
	[3, 2],
	[3, 6],
	[3, 8],
	[4, 9],
	[2, 4],
	[6, 2],
	[8, 6],
	[9, 8],

	// Mid
	[1, 9],
	[5, 9],
	[5, 4],
	[11, 4],
	[11, 2],
	[10, 2],
	[10, 6],
	[7, 6],
	[7, 8],
	[1, 8],
];
