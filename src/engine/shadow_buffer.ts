import { Gfx } from "engine";
import { Point3 } from "./math";

export type Shadow = {
	position: Point3,
	radius: number,
	umbra: number,
	shape: number,
	color: number,
};

export class ShadowBuffer {
	buffer: GPUBuffer;
	count = 0;

	static SHADOW_SIZE = 8 * 4; // Aligned size of struct Shadow {}

	constructor(readonly gfx: Gfx, readonly capacity: number) {
		this.buffer = gfx.device.createBuffer({
			label: 'Shadow Buffer',
			size: ShadowBuffer.SHADOW_SIZE * capacity,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
	}

	push(shadow: Shadow) {
		const idx = this.count;
		const data = new ArrayBuffer(ShadowBuffer.SHADOW_SIZE);

		const floatView = new Float32Array(data);
		floatView.set([ ...shadow.position, shadow.radius, shadow.umbra ]);

		const intView = new Uint32Array(data);
		intView.set([shadow.shape, shadow.color], 5);

		const offset = idx * ShadowBuffer.SHADOW_SIZE;
		this.gfx.device.queue.writeBuffer(this.buffer, offset, data);

		this.count += 1;
	}

	moveShadow(idx: number, position: Point3) {
		const data = new Float32Array(position);
		const offset = idx * ShadowBuffer.SHADOW_SIZE;
		this.gfx.device.queue.writeBuffer(this.buffer, offset, data);
	}

	bindingResource(): GPUBindingResource {
		return { buffer: this.buffer };
	}
}


