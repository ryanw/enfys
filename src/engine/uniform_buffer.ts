import { Gfx } from 'engine';

export type WgslType = 'f32' | 'i32' | 'u32' | 'vec2f' | 'vec3f' | 'vec4f' | 'vec2i' | 'vec3i' | 'vec4i' | 'vec2u' | 'vec3u' | 'vec4u' | 'mat4x4f';
export type UniformMappingPair = [string, WgslType];
export type UniformMapping = Array<UniformMappingPair>;
export type UniformOffsetPair = [string, number];
export type UniformOffsets = Record<string, [WgslType, number]>;
export type ByteSize = number;
export type Alignment = number;

export type UniformRecord = Record<string, boolean | number | Array<number>>;

/**
 * Storage for a struct inside a {@link GPUBuffer} which can be bound as a uniform in shaders.
 * Automatically handles byte alignment of mixed field types.
 */
export class UniformBuffer {
	/**
	 * Raw uniform buffer
	 */
	buffer!: GPUBuffer;
	/**
	 * Aligned byte offsets of each field in the struct
	 */
	readonly offsets: UniformOffsets;

	constructor(
		readonly gfx: Gfx,
		/**
		 * Array of {@link UniformMappingPair} defining the shape of the struct as it appears in WGSL
		 */
		readonly mapping: UniformMapping,
	) {
		this.offsets = calculateOffsets(mapping);
		const size = calculateBufferSize(this.offsets);
		if (size > 0) {
			this.buffer = this.gfx.createBuffer(size, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
		}
		else {
			console.warn('Zero sized Uniform', this.mapping);
		}
	}

	bufferSize() {
		return calculateBufferSize(this.offsets);
	}

	/**
	 * Replace the entire uniform with new data. You must provide every field.
	 */
	replace(fields: UniformRecord) {
		const theirKeys = new Set(Object.keys(fields));
		const ourKeys = new Set(Object.keys(this.offsets));
		// @ts-expect-error FIXME symmetricDifference isn't in the types
		const diff: Set<string> = theirKeys.symmetricDifference(ourKeys);
		if (diff.size > 0) {
			console.error("Keys don't match", diff, theirKeys, ourKeys);
			throw new Error(`Keys don't match: ${theirKeys} != ${ourKeys}`);
		}

		// Copy every field into a single array buffer
		const bufferSize = this.bufferSize();
		const dataBuffer = new ArrayBuffer(bufferSize);
		const floatBuffer = new Float32Array(dataBuffer);
		const intBuffer = new Int32Array(dataBuffer);
		const uintBuffer = new Uint32Array(dataBuffer);

		for (const key of theirKeys) {
			const [typ, byteOffset] = this.offsets[key];
			const offset = byteOffset / 4;
			const value = toArray(fields[key]);

			switch (typ) {
			case 'f32':
			case 'vec2f':
			case 'vec3f':
			case 'vec4f':
			case 'mat4x4f':
				floatBuffer.set(value, offset);
				break;

			case 'i32':
			case 'vec2i':
			case 'vec4i':
			case 'vec3i':
				intBuffer.set(value, offset);
				break;

			case 'u32':
			case 'vec2u':
			case 'vec3u':
			case 'vec4u':
				uintBuffer.set(value, offset);
				break;
			}
		}

		this.gfx.device.queue.writeBuffer(this.buffer, 0, dataBuffer);
	}

	/**
	 * Update a field on the struct on the GPU.
	 * Only fields defined in the original {@link UniformMapping} can be set.
	 */
	set(field: string, value: boolean | number | bigint | Array<number | bigint>) {
		if (!(field in this.offsets)) {
			console.error('Uniform field not found', field);
			return;
		}
		const [typ, offset] = this.offsets[field];
		const valueBuffer = toArrayBuffer(typ, value);
		this.gfx.device.queue.writeBuffer(this.buffer, offset, valueBuffer);
	}

	bindingResource(): GPUBindingResource {
		return { buffer: this.buffer };
	}
}

function toArray(value: BufferLike): Array<number> {
	if (Array.isArray(value)) return value.map(Number);
	if (typeof value === 'number') return [value];
	if (typeof value === 'bigint') return [Number(value)];
	if (value) return [1];
	return [0];
}

export type BufferLike = boolean | number | bigint | Array<number | bigint>;
export function toArrayBuffer(typ: WgslType, value: BufferLike): ArrayBuffer {
	const data = toArray(value);
	switch (typ) {
	case 'f32':
	case 'vec2f':
	case 'vec3f':
	case 'vec4f':
	case 'mat4x4f':
		return new Float32Array(data);

	case 'i32':
	case 'vec2i':
	case 'vec4i':
	case 'vec3i':
		return new Int32Array(data);

	case 'u32':
	case 'vec2u':
	case 'vec3u':
	case 'vec4u':
		return new Uint32Array(data);
	}
}

function calculateBufferSize(offsets: UniformOffsets): number {
	let total = 0;
	let lastType: WgslType | undefined;

	for (const [typ, offset] of Object.values(offsets)) {
		if (offset >= total) {
			lastType = typ;
			total = offset;
		}
	}

	if (lastType) {
		const [size, _] = ALIGNMENTS[lastType];
		total += size;
	}

	return Math.max(Math.ceil(total / 16) * 16, 256);
}

function calculateOffsets(mapping: UniformMapping): UniformOffsets {
	const offsets: UniformOffsets = {};
	let pos = 0;
	for (const [key, typ] of mapping) {
		const [size, align] = ALIGNMENTS[typ];
		pos = alignBytes(pos, align);
		offsets[key] = [typ, pos];
		pos += size;
	};
	return offsets;
}

function alignBytes(size: ByteSize, alignment: Alignment): number {
	return ((size + alignment - 1) / alignment | 0) * alignment;
}

const ALIGNMENTS: Record<WgslType, [ByteSize, Alignment]> = {
	f32: [4, 4],
	i32: [4, 4],
	u32: [4, 4],
	vec2f: [8, 8],
	vec2i: [8, 8],
	vec2u: [8, 8],
	vec3f: [12, 16],
	vec3i: [12, 16],
	vec3u: [12, 16],
	vec4f: [16, 16],
	vec4i: [16, 16],
	vec4u: [16, 16],
	mat4x4f: [64, 16],
};
