import { Gfx, Size, calculateNormals } from 'engine';
import { PHI, Point2, Point3, Vector3, Vector4 } from './math';
import { add, normalize } from './math/vectors';

/**
 * Enforces all properties on a Vertex to be `number` or `Array<number>`
 */
export type Vertex<T> = {
	[K in keyof T]: T[K] extends (Array<number | bigint> | number | bigint) ? T[K] : never;
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
 * Vertex that can be used to draw textured polygons
 */
export interface ColorVertex extends NormalVertex {
	color: number | bigint,
}

/**
 * Vertex with an offset
 */
export interface OffsetInstance {
	offset: Point3;
	variantIndex: number | bigint;
}

export interface ColorInstance extends OffsetInstance {
	// 32bit rgba color
	instanceColor: number | bigint;
}


/**
 * Collection of Vertices representing some kind of 3D geometry.
 * @typeParm V - Type of the vertices in this mesh
 * @typeParm I - Type of the instances of this mesh
 */
export class Mesh<V extends Vertex<V>, I extends Vertex<I> = object> {
	// Matches the `in: VertexIn` order
	vertexOrder: Array<keyof V> = [];
	instanceOrder: Array<keyof I> = [];
	vertexBuffer!: GPUBuffer;
	instanceBuffer!: GPUBuffer;
	vertexCount: number = 0;
	instanceCount: number = 0;
	variantCount: number = 1;

	/**
	 * @param vertices Array of Vertices
	 * @param vertices Array of Instances
	 */
	constructor(readonly gfx: Gfx, vertices: Array<V> = [], instances: Array<I> = []) {
		this.uploadVertices(vertices);
		this.uploadInstances(instances);
	}

	uploadInstances(instances: Array<I>) {
		const { device } = this.gfx;
		const keys = this.instanceOrder.length === 0 && instances.length > 0
			? Object.keys(instances[0]).sort() as Array<keyof I>
			: this.instanceOrder;
		// Write instances
		const instanceData = toArrayBuffer(instances, keys);
		const instanceBuffer = device.createBuffer({
			label: 'Mesh Instance Buffer',
			size: instanceData.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});
		device.queue.writeBuffer(instanceBuffer, 0, instanceData);

		this.instanceCount = instances.length;
		this.instanceBuffer = instanceBuffer;
	}

	uploadVertices(vertices: Array<V>, vertexCount?: number) {
		const { device } = this.gfx;
		const keys = this.vertexOrder.length === 0 && vertices.length > 0
			? Object.keys(vertices[0]).sort() as Array<keyof V>
			: this.vertexOrder;

		// Write vertices
		const vertexData = toArrayBuffer(vertices, keys);
		const vertexBuffer = device.createBuffer({
			label: 'Mesh Vertex Buffer',
			size: vertexData.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});
		device.queue.writeBuffer(vertexBuffer, 0, vertexData);

		// Vertex count can be lower if we have multiple variants in the same buffer
		this.vertexCount = vertexCount ?? vertices.length;
		this.vertexBuffer = vertexBuffer;
	}

	destroy() {
		this.vertexBuffer.destroy();
		this.instanceBuffer.destroy();
	}
}

/**
 * Instanced Mesh made of {@link ColorVertex} vertices
 */
export class SimpleMesh extends Mesh<ColorVertex, ColorInstance> {
	vertexOrder: Array<keyof ColorVertex> = ['position', 'normal', 'color'];
	instanceOrder: Array<keyof ColorInstance> = ['offset', 'instanceColor', 'variantIndex'];
	constructor(gfx: Gfx, vertices: Array<ColorVertex> = [], instances?: Array<ColorInstance>) {
		super(gfx);
		this.uploadVertices(vertices);
		if (instances) {
			this.uploadInstances(instances);
		}
		else {
			this.uploadInstances([{
				offset: [0, 0, 0],
				instanceColor: BigInt(0xffffffff),
				variantIndex: 0,
			}]);
		}
	}
}



/**
 * Convert the Mesh into a single `ArrayBuffer`, each vertex attribute is interleaved.
 * Assumes all numbers are floats
 * @return ArrayBuffer The Vertex/Instance attribute data
 */
function toArrayBuffer<V extends Vertex<V>>(vertices: Array<V>, attributes: Array<keyof V>): ArrayBuffer {
	if (vertices.length === 0) return new Float32Array();

	let vertexSize = 0;
	const proto = vertices[0];
	for (const key of attributes) {
		const prop = proto[key];
		if (Array.isArray(prop)) {
			vertexSize += (prop as Array<number>).length;
		}
		else {
			vertexSize += 1;
		}
	}
	const size = vertexSize * vertices.length;
	const bytes = new ArrayBuffer(size * 4);
	const floatData = new Float32Array(bytes);
	const intData = new Uint32Array(bytes);

	// Copy data into array
	let offset = 0;
	for (let i = 0; i < vertices.length; i++) {
		const vertex = vertices[i];
		if (!vertex) {
			console.error('Missing vertex!', i);
		}
		for (const key of attributes) {
			const prop = vertex[key];
			if (!prop) continue;

			if (Array.isArray(prop)) {
				// FIXME tsc is ignoring `isArray`
				floatData.set(prop as Array<number>, offset);
				offset += (prop as Array<number>).length;
			} else if (typeof prop === 'number') {
				floatData.set([prop], offset);
				offset += 1;
			} else if (typeof prop === 'bigint') {
				// Forced to 32bit
				intData.set([Number(prop)], offset);
				offset += 1;
			}

		}
	}

	return bytes;
}

function toVertex(position: Point3): ColorVertex {
	return {
		position: [...position],
		normal: [0, 1, 0],
		color: BigInt(0xffffffff),
	};
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

		const vertexCount = (divisions[0] + 1) * (divisions[1] + 1) * quad.length;

		const subquad: Array<Point3> = new Array(vertexCount);

		const gap = 0.0;
		const stepX = s0 * 2 + gap;
		const stepY = s1 * 2 + gap;
		const offset = [
			-s0 * divisions[0],
			-s1 * divisions[1],
		];
		for (let y = 0; y <= divisions[1]; y++) {
			for (let x = 0; x <= divisions[0]; x++) {
				const o = x + y * (divisions[0] + 1);
				for (let i = 0; i < quad.length; i++) {
					const p = quad[i];
					const idx = o * quad.length + i;
					const vertexPosition: Point3 = [
						stepX * x + offset[0],
						0,
						stepY * y + offset[1],
					];
					subquad[idx] = add(p, vertexPosition);
				}
			}
		}

		const vertices = subquad.map(toVertex);

		super(gfx, vertices);
	}
}

/**
 * Mesh shaped like an Cube
 */
export class Cube extends SimpleMesh {
	constructor(gfx: Gfx, scale: number = 1) {
		const vertices = CUBE_VERTS.map(v => toVertex(v.map(i => i * scale) as Point3));
		calculateNormals(vertices);
		super(gfx, vertices);
	}
}

/**
 * Mesh shaped like an Icosahedron
 */
export class Icosahedron extends SimpleMesh {
	constructor(gfx: Gfx, instances?: Array<ColorInstance>) {
		const vertices = buildIcosahedron(position => ({
			position: [...position],
			normal: [0, 0, 0],
			color: BigInt(0xff00ddff),
		} as ColorVertex));
		calculateNormals(vertices);
		super(gfx, vertices, instances);
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

export const CUBE_VERTS: Array<Point3> = [
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
