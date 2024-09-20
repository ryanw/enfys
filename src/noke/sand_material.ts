import { Color, Gfx } from "engine";
import { Material } from "engine/material";
import { UniformBuffer } from "engine/uniform_buffer";
import { SandBuffer } from "./sand_buffer";

/**
 * Simple color {@link Material} stored in a {@link GPUBuffer}
 */
export class SandMaterial extends Material {
	readonly uniform: UniformBuffer;

	constructor(
		readonly gfx: Gfx,
		public sand: SandBuffer,
	) {
		super();
		this.uniform = new UniformBuffer(gfx, [ ['tint', 'vec4f'] ]);
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}
}


