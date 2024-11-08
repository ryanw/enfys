import { Color, Gfx } from 'engine';
import { colorToBigInt } from 'engine/color';
import { Material } from 'engine/material';
import { UniformBuffer } from 'engine/uniform_buffer';

export class SunMaterial extends Material {
	readonly uniform: UniformBuffer;
	private _hazeColor!: bigint;

	constructor(
		readonly gfx: Gfx,
		hazeColor: number | bigint | Color,
	) {
		super();
		this.uniform = new UniformBuffer(gfx, [
			['hazeColor', 'u32'],
		]);
		if (Array.isArray(hazeColor)) {
			this.hazeColor = colorToBigInt(hazeColor);
		} else {
			this.hazeColor = BigInt(hazeColor);
		}
	}

	set hazeColor(color: number | bigint) {
		this._hazeColor = BigInt(color);
		this.updateUniform();
	}

	updateUniform() {
		this.uniform.set('hazeColor', this._hazeColor);
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}
}

