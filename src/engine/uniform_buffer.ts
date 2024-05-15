import { Gfx } from "engine";

export type WgslType = 'f32' | 'i32' | 'u32' | 'vec2f' | 'vec3f' | 'vec4f' | 'vec2i' | 'vec3i' | 'vec4i' | 'vec2u' | 'vec3u' | 'vec4u';
export type UniformMappingPair = [string, WgslType];
export type UniformMapping = Array<UniformMappingPair>;
export type UniformOffsetPair = [string, number];
export type UniformOffsets = Record<string, [WgslType, number]>;
export type ByteSize = number;
export type Alignment = number;


export class UniformBuffer {
	readonly buffer: GPUBuffer;
	readonly offsets: UniformOffsets;

	constructor(
		readonly gfx: Gfx,
		readonly mapping: UniformMapping,
	) {
		const size = calculateBufferSize(mapping);
		this.buffer = gfx.createBuffer(size, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
		this.offsets = calculateOffsets(mapping);
	}

	replace(fields: Record<string, boolean | number | Array<number>>) {
		const theirKeys = new Set(Object.keys(fields));
		const ourKeys = new Set(Object.keys(this.offsets))
		// FIXME symmetricDifference isn't in the types
		const diff: Set<string> = (theirKeys as any).symmetricDifference(ourKeys);
		if (diff.size > 0) {
			console.error("Keys don't match", diff, theirKeys, ourKeys);
			throw new Error(`Keys don't match: ${theirKeys} != ${ourKeys}`);
		}
	}

	set(field: string, value: boolean | number | Array<number>) {
	const [typ, offset] = this.offsets[field];
	if (offset == null) {
		console.error("Uniform field not found", field);
		return;
	}
	const valueBuffer = toArrayBuffer(typ, value);
	this.gfx.device.queue.writeBuffer(this.buffer, offset, valueBuffer);
}
}

function toArray(value: boolean | number | Array<number>): Array<number> {
	if (Array.isArray(value)) return value;
	if (typeof value === 'number') return [value];
	if (value) return [1];
	return [0];
}

function toArrayBuffer(typ: WgslType, value: boolean | number | Array<number>): ArrayBuffer {
	const data = toArray(value);
	switch (typ) {
		case 'f32':
		case 'vec2f':
		case 'vec3f':
		case 'vec4f':
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

function calculateBufferSize(mapping: UniformMapping): number {
	// FIXME TODO
	return 256;
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
};
