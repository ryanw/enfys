import { Gfx } from "engine";
import { Point3, Point4 } from "./math";

/**
 * Enforces all properties on a Vertex to be `number` or `Array<number>`
 */
export type Vertex<T> = {
	[K in keyof T]: T[K] extends (Array<number> | number) ? T[K] : never;
}

/**
 * Collection of Vertices representing some kind of 3D geometry.
 * @typeParm V - Type of the vertices in this mesh
 */
export class Mesh<V extends Vertex<V>> {
	readonly buffer: GPUBuffer;
	readonly count: number = 0;

	/**
	 * @param vertices Array of Vertices
	 */
	constructor(readonly gfx: Gfx, vertices: Array<V>) {
		const { device } = gfx;
		if (vertices.length < 1) {
			throw new Error('Mesh must have at least 1 vertex');
		}
		const keys = Object.keys(vertices[0]).sort() as Array<keyof V>;

		const data = toArrayBuffer(vertices, keys);
		const buffer = device.createBuffer({
			label: 'Mesh Attribute Buffer',
			size: data.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(buffer, 0, data);

		this.count = vertices.length;
		this.buffer = buffer;
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

export type PointVertex = { position: Point4 };

export class Cube extends Mesh<PointVertex> {
	constructor(gfx: Gfx) {
		super(gfx, CUBE_VERTS.map(position => ({ position: [...position, 1.0] })));
	}
}

export class Tri extends Mesh<PointVertex> {
	constructor(gfx: Gfx) {
		super(gfx, [
			{ position: [-1, -1, 0, 1] },
			{ position: [0, 1, 0, 1] },
			{ position: [1, -1, 0, 1] },
		]);
	}
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
