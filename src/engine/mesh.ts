import { Gfx, Size, Triangle, calculateNormals } from 'engine';
import { Matrix4, PHI, Point2, Point3, Vector2, Vector3, Vector4 } from './math';
import { add, normalize, scale } from './math/vectors';
import { identity, multiply, rotationFromVector, scaling, transformPoint, translation } from './math/transform';
import { colorToBigInt, colorToInt, hsl } from './color';

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
	softness: number,
}

/**
 * Vertex with an transform
 */
export interface TransformInstance {
	transform: Matrix4;
	variantIndex: number | bigint;
	live: number;
}

export interface ColorInstance extends TransformInstance {
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
	instanceSize: number = 0;
	gaps: Set<number> = new Set();
	private instanceCapacity: number = 2;

	/**
	 * @param vertices Array of Vertices
	 * @param vertices Array of Instances
	 */
	constructor(readonly gfx: Gfx, vertices: Array<V> = [], instances: Array<I> = []) {
		this.uploadVertices(vertices);
		this.uploadInstances(instances);
	}

	get hasCapacity(): boolean {
		return this.instanceCount < this.instanceCapacity;
	}

	async resizeInstanceCapacity(capacity: number) {
		if (this.instanceCapacity === capacity) return;
		const { device } = this.gfx;
		const { min, ceil } = Math;

		const change = capacity / this.instanceCapacity;
		this.instanceCapacity = capacity;

		const oldInstanceBuffer = this.instanceBuffer;
		if (!oldInstanceBuffer) return;
		console.debug("Resizing Instance buffer %d bytes", ceil(oldInstanceBuffer.size * change));
		const newInstanceBuffer = device.createBuffer({
			label: `Mesh<${this.constructor.name}> Instance Buffer`,
			size: ceil(oldInstanceBuffer.size * change),
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});
		this.instanceBuffer = newInstanceBuffer;

		if (oldInstanceBuffer.size > 0) {
			// Copy old buffer into new buffer
			await this.gfx.encode(async enc => {
				enc.copyBufferToBuffer(
					oldInstanceBuffer, 0,
					newInstanceBuffer, 0,
					min(oldInstanceBuffer.size, newInstanceBuffer.size)
				);
			});
		}
	}

	uploadInstances(instances: Array<I>) {
		if (instances.length === 0) {
			this.instanceCount = 0;
			return;
		}

		const { device } = this.gfx;
		const capacity = Math.max(this.instanceCapacity, instances.length);
		this.instanceSize = instances.length > 0 ? calcVertexSize(instances[0]) : this.instanceSize;
		const keys = this.instanceOrder.length === 0 && instances.length > 0
			? Object.keys(instances[0]).sort() as Array<keyof I>
			: this.instanceOrder;
		// Write instances
		const instanceData = toArrayBuffer(instances, keys);
		const label = `Mesh<${this.constructor.name}> Instance Buffer`;
		console.debug("Creating %s @ %d * %d = %d bytes", label, capacity, this.instanceSize, capacity * this.instanceSize);
		const instanceBuffer = device.createBuffer({
			label,
			size: capacity * this.instanceSize,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});
		device.queue.writeBuffer(instanceBuffer, 0, instanceData);

		this.instanceCount = instances.length;
		this.instanceBuffer = instanceBuffer;
	}

	writeInstance(idx: number, instance: I) {
		if (idx >= this.instanceCapacity) {
			console.error(`Instance is outside capacity. ${idx} instance, ${this.instanceCapacity} capacity`, this, instance);
			throw new Error(`Instance is outside capacity. ${idx} instance, ${this.instanceCapacity} capacity`);
		}
		const { device } = this.gfx;
		const instanceData = toArrayBuffer([instance], this.instanceOrder);
		const byteOffset = instanceData.byteLength * idx;
		device.queue.writeBuffer(this.instanceBuffer, byteOffset, instanceData);
	}

	pushInstance(instance: I): number {
		if (!this.instanceBuffer || this.instanceCapacity === 0) {
			this.uploadInstances([instance]);
			return 0;
		}
		if (!this.hasCapacity) {
			const newCapacity = Math.ceil(this.instanceCapacity * 1.5);
			this.resizeInstanceCapacity(newCapacity);
		}
		// Reuse a gap
		if (this.gaps.size > 0) {
			const idx: number = this.gaps.values().next().value;
			this.gaps.delete(idx);
			this.writeInstance(idx, instance);
			return idx;
		}
		const { device } = this.gfx;
		const instanceData = toArrayBuffer([instance], this.instanceOrder);
		const byteOffset = instanceData.byteLength * this.instanceCount;
		device.queue.writeBuffer(this.instanceBuffer, byteOffset, instanceData);

		this.instanceCount += 1;
		return this.instanceCount - 1;
	}

	removeInstance(idx: number) {
		if (idx === this.instanceCount - 1) {
			// End value, so just resize
			this.instanceCount -= 1;
		}
		else {
			// Start or middle index
			this.gaps.add(idx);
			// Live flag is last
			const liveOffset = this.instanceSize - 4;
			const byteOffset = idx * this.instanceSize + liveOffset;
			console.log("Removing instance", idx, byteOffset, liveOffset);
			this.gfx.device.queue.writeBuffer(this.instanceBuffer, byteOffset, new Uint32Array([0]));
		}
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
		this.variantCount = vertices.length / this.vertexCount;
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
	vertexOrder: Array<keyof ColorVertex> = ['position', 'normal', 'color', 'softness'];
	instanceOrder: Array<keyof ColorInstance> = ['transform', 'instanceColor', 'variantIndex', 'live'];
	constructor(gfx: Gfx, vertices: Array<ColorVertex> = [], instances?: Array<ColorInstance>) {
		super(gfx);
		this.uploadVertices(vertices);
		if (instances) {
			this.uploadInstances(instances);
		}
		else {
			//this.uploadInstances([{
			//	transform: identity(),
			//	instanceColor: BigInt(0xffffffff),
			//	variantIndex: BigInt(0x0),
			//	live: 1,
			//}]);
		}
	}
}

function calcVertexSize<V extends Vertex<V>>(proto: V): number {
	let vertexSize = 0;
	for (const key in proto) {
		const prop = proto[key];
		if (Array.isArray(prop)) {
			vertexSize += (prop as Array<number>).length;
		}
		else {
			vertexSize += 1;
		}
	}
	return vertexSize * 4;
}


/**
 * Convert the Mesh into a single `ArrayBuffer`, each vertex attribute is interleaved.
 * Assumes all numbers are floats
 * @return ArrayBuffer The Vertex/Instance attribute data
 */
function toArrayBuffer<V extends Vertex<V>>(vertices: Array<V>, attributes: Array<keyof V>): ArrayBuffer {
	if (vertices.length === 0) return new Float32Array();

	const vertexSize = calcVertexSize(vertices[0]);
	const byteSize = vertexSize * vertices.length;
	const bytes = new ArrayBuffer(byteSize);
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
			if (prop == null) {
				console.warn("Missing field in vertex buffer", key);
				continue;
			}

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
		softness: 0.0,
		position: [...position],
		normal: [0, 1, 0],
		color: BigInt(0xffffffff),
	};
}

/**
 * Mesh shaped like a flat subdivided plane
 */
export class QuadMesh extends SimpleMesh {
	constructor(gfx: Gfx, divisions: [number, number] = [1, 1], size: Size = [1, 1]) {
		const vertices = buildQuad(divisions, size).map(toVertex);
		super(gfx, vertices);
	}
}

/**
 * Mesh shaped like an Cube
 */
export class CubeMesh extends SimpleMesh {
	constructor(gfx: Gfx, divisions: [number, number, number] = [0, 0, 0], scale: number | Vector3 = 1) {
	if (divisions[0] ==null) debugger;
		const s: Vector3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
		const transforms = [
			// Top
			multiply(
				scaling(...s),
				translation(0, 1, 0),
				rotationFromVector([0, 1, 0], [0, 1, 0]),
			),
			// Bottom
			multiply(
				scaling(...s),
				translation(0, -1, 0),
				rotationFromVector([0, -1, 0], [0, 1, 0]),
			),
			// Left
			multiply(
				scaling(...s),
				translation(-1, 0, 0),
				rotationFromVector([-1, 0, 0], [0, 1, 0]),
			),
			// Right
			multiply(
				scaling(...s),
				translation(1, 0, 0),
				rotationFromVector([1, 0, 0], [0, 1, 0]),
			),
			// Front
			multiply(
				scaling(...s),
				translation(0, 0, 1),
				rotationFromVector([0, 0, 1], [0, 1, 0]),
			),
			// Back
			multiply(
				scaling(...s),
				translation(0, 0, -1),
				rotationFromVector([0, 0, -1], [0, 1, 0]),
			),
		];
		const divs: Array<[number, number]> = [
			[divisions[0], divisions[2]],
			[divisions[1], divisions[2]],
			[divisions[0], divisions[1]],
		];

		const vertices = transforms.map((t,i) => buildQuad(divs[i/2|0]).map(v => transformPoint(t, v))).flat().map(toVertex);
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
			softness: 0.0,
			position: [...position],
			normal: [0, 0, 0],
			color: BigInt(0xff00ddff),
		} as ColorVertex));
		calculateNormals(vertices);
		super(gfx, vertices, instances);
	}
}

/**
 * Sphere Mesh created from subdivided icosahedron
 */
export class Icosphere extends SimpleMesh {
	constructor(gfx: Gfx, divisions: number, instances?: Array<ColorInstance>) {
		const vertices = buildIcosphere(
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

export class InnerIcosphere extends SimpleMesh {
	constructor(gfx: Gfx, divisions: number, instances?: Array<ColorInstance>) {
		const vertices = buildIcosphere(
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


export function buildIcosahedron<T>(callback: (position: Point3, index: number) => T): Array<T> {
	return ICOSAHEDRON_TRIS.map(
		(tri) => tri.map(
			(v, i) =>
				callback(normalize(ICOSAHEDRON_VERTICES[v]), i)
		)
	).flat();
}

type BuildCallback<T> = (position: Point3, index: number) => T;
export function buildIcosphere<T>(divisions: number, invert: boolean, callback: BuildCallback<T>): Array<T>;
export function buildIcosphere<T>(divisions: number, callback: BuildCallback<T>): Array<T>;
export function buildIcosphere<T>(divisions: number, invertOrCallback: boolean | BuildCallback<T>, maybeCallback?: BuildCallback<T>): Array<T> {
	const invert = typeof invertOrCallback === 'boolean' ? invertOrCallback : false;
	const callback = typeof invertOrCallback === 'boolean' ? maybeCallback : invertOrCallback;
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


export function subdivideFace(face: Triangle, divisions: number): Array<Triangle> {
	if (divisions <= 0) {
		return [face];
	}
	const [a, b, c] = face;
	const d: Point3 = scale(add(a, b), 0.5);
	const e: Point3 = scale(add(b, c), 0.5);
	const f: Point3 = scale(add(c, a), 0.5);

	const faces: Array<Triangle> = [[a, d, f], [d, b, e], [f, e, c], [f, d, e]];
	return faces.flatMap(face => subdivideFace(face, divisions - 1))
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

export function buildCylinder(
	length: number,
	radius: number,
	divisions: [number, number],
): Array<Point3> {
	const [rd, hd] = divisions;

	const topCap = buildDisc(radius, rd).map<Point3>(p => add(p, [0, 0.5, 0]));
	const botCap = flipFaces(buildDisc(radius, rd).map<Point3>(p => add(p, [0, -0.5, 0])));

	const vertices = [...topCap, ...botCap];

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

export function buildDisc(radius: number, divisions: number): Point3[] {
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

export function flipFaces(faces: Point3[]): Point3[] {
	const flipped = new Array(faces.length);
	for (let i = 0; i < faces.length - 2; i += 3) {
		flipped[i + 0] = (faces[i + 1]);
		flipped[i + 1] = (faces[i + 0]);
		flipped[i + 2] = (faces[i + 2]);
	}
	return flipped;
}

export function buildQuad(divisions: [number, number] = [1, 1], size: Size = [1, 1]): Array<Point3> {
	const s0 = (1 / (divisions[0] + 1)) * size[0];
	const s1 = (1 / (divisions[1] + 1)) * size[1];
	const quad: Array<Point3> = [
		[-s0, 0, -s1],
		[-s0, 0, s1],
		[s0, 0, s1],

		[s0, 0, s1],
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

	return subquad;
}
