import { Gfx } from "engine";

export class RingBuffer<T extends ArrayBufferView = Float32Array> {
	buffer: GPUBuffer;
	private nextIndex = 0;

	constructor(
		private gfx: Gfx,
		private capacity: number = 8,
		private itemByteLength: number = 256,
	) {
		this.itemByteLength = alignSize(
			this.itemByteLength,
			gfx.device.limits.minUniformBufferOffsetAlignment,
		);
		const { device } = gfx;
		const bufferSize = (this.itemByteLength * capacity);
		this.buffer = device.createBuffer({
			size: bufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
	}

	push(item: T): number {
		if (item.byteLength > this.itemByteLength) {
			throw new Error(`Item is too big, expected ${this.itemByteLength} got ${item.byteLength}`)
		}
		const index = this.nextIndex;
		this.nextIndex = (index + 1) % this.capacity;

		this.writeAt(index, item);

		return index;
	}

	bindingResource(index: number): GPUBindingResource {
		return {
			buffer: this.buffer,
			size: this.itemByteLength,
			offset: this.indexOffset(index),
		};
	}

	private indexOffset(index: number): number {
		return this.itemByteLength * index;
	}

	private writeAt(index: number, item: T) {
		const offset = this.indexOffset(index);
		this.gfx.device.queue.writeBuffer(this.buffer, offset, item);
	}
}
function alignSize(size: number, alignment: number): number {
	return ((size + alignment - 1) / alignment | 0) * alignment;
}

