import { Gfx } from "engine";
import { UniformBuffer } from "engine/uniform_buffer";

const MATERIAL_SIZE = 4; // u32

export class SandBuffer {
	/**
	 * Type of sand in each cell. Tightly packed array<u32>
	 */
	readonly buffer0: GPUBuffer;
	/**
	 * Velocity of the sand in each cell. Tightly packed array<vec2f>
	 */
	readonly buffer1: GPUBuffer;
	readonly dirtyBuffer: GPUBuffer;
	/**
	 * Velocity of the sand in each cell. Tightly packed array<vec2f>
	 */
	readonly arenaUniform: UniformBuffer;

	private swapped = false;

	constructor(gfx: Gfx, readonly size: [number, number]) {
		const bufferSize = size[0] * size[1] * MATERIAL_SIZE;
		const usage = GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;

		this.arenaUniform = new UniformBuffer(gfx, [
			['size', 'vec2f'],
			['time', 'f32'],
		]);
		this.arenaUniform.set('size', size);
		this.buffer0 = gfx.createBuffer(bufferSize, usage, "Sand Buffer 0");
		this.buffer1 = gfx.createBuffer(bufferSize, usage, "Sand Buffer 1");
		this.dirtyBuffer = gfx.createBuffer(bufferSize, usage, "Sand Dirty Buffer");
	}

	get frontBuffer(): GPUBuffer {
		return this.swapped ? this.buffer1 : this.buffer0;
	}

	get backBuffer(): GPUBuffer {
		return this.swapped ? this.buffer0 : this.buffer1;
	}

	swap() {
		this.swapped = !this.swapped;
	}
}
