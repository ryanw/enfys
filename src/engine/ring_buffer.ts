import { Gfx } from "engine";
import { UniformBuffer, UniformMapping, toArrayBuffer as toUniformArrayBuffer } from "./uniform_buffer";

export class RingBuffer extends UniformBuffer {
	private nextIndex = 0;
	constructor(
		readonly gfx: Gfx,
		/**
		 * Total numebr of unique items that can be stored before the oldest is overwritten
		 */
		readonly capacity: number,
		/**
		 * Array of {@link UniformMappingPair} defining the shape of the struct as it appears in WGSL
		 */
		readonly mapping: UniformMapping,
	) {
		super(gfx, mapping);

		const size = this.itemSize() * capacity;
		this.buffer = this.gfx.createBuffer(size, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
	}

	override bufferSize() {
		return this.itemSize() * this.capacity || 0;
	}

	itemSize() {
		return super.bufferSize();
	}

	push(fields: Record<string, boolean | number | Array<number>>): number {
		const index = this.nextIndex;
		this.nextIndex = (index + 1) % this.capacity;
		this.replaceItem(index, fields);
		return index;
	}

	replaceItem(index: number, fields: Record<string, boolean | number | Array<number>>) {
		const theirKeys = new Set(Object.keys(fields));
		const ourKeys = new Set(Object.keys(this.offsets));
		// @ts-expect-error FIXME symmetricDifference isn't in the types
		const diff: Set<string> = theirKeys.symmetricDifference(ourKeys);
		if (diff.size > 0) {
			console.error("Keys don't match", diff, theirKeys, ourKeys);
			throw new Error(`Keys don't match: ${theirKeys} != ${ourKeys}`);
		}

		// FIXME update everything in 1 write
		for (const key of theirKeys) {
			this.setItem(index, key, fields[key]);
		}
	}

	/**
	 * Update a field on the struct on the GPU.
	 * Only fields defined in the original {@link UniformMapping} can be set.
	 */
	setItem(index: number, field: string, value: boolean | number | bigint | Array<number | bigint>) {
		if (!(field in this.offsets)) {
			console.error('Uniform field not found', field);
			return;
		}
		const [typ, offset] = this.offsets[field];
		const valueBuffer = toUniformArrayBuffer(typ, value);
		const itemOffset = this.itemOffset(index);
		this.gfx.device.queue.writeBuffer(this.buffer, offset + itemOffset, valueBuffer);
	}

	itemOffset(index: number): number {
		return index * this.itemSize();
	}

	itemBindingResource(index: number): GPUBindingResource {
		return {
			buffer: this.buffer,
			size: this.itemSize(),
			offset: this.itemOffset(index),
		};
	}
}
