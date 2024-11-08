import { Gfx } from 'engine';
import { Material } from 'engine/material';
import { UniformBuffer } from 'engine/uniform_buffer';

export class PlanetMaterial extends Material {
	readonly uniform: UniformBuffer;

	constructor(
		readonly gfx: Gfx,
	) {
		super();
		this.uniform = new UniformBuffer(gfx, [
			['color', 'u32'],
		]);
		this.updateUniform();
	}

	updateUniform() {
		this.uniform.set('color', BigInt(0xffffff00));
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}
}

