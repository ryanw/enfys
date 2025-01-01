import { Color, Gfx } from 'engine';
import { colorToBigInt } from 'engine/color';
import { Material } from 'engine/material';
import { UniformBuffer } from 'engine/uniform_buffer';

export class WaterMaterial extends Material {
	readonly uniform: UniformBuffer;
	forwardRender = true;
	private _deepColor: bigint;
	private _shallowColor: bigint;

	constructor(
		readonly gfx: Gfx,
		public seed: number,
		shallowColor?: number | bigint | Color,
		deepColor?: number | bigint | Color,
	) {
		super();
		if (Array.isArray(shallowColor)) {
			this._shallowColor = colorToBigInt(shallowColor);
		} else {
			this._shallowColor = BigInt(shallowColor||0);
		}
		if (Array.isArray(deepColor)) {
			this._deepColor = colorToBigInt(deepColor);
		} else {
			this._deepColor = BigInt(deepColor||0);
		}
		this.uniform = new UniformBuffer(gfx, [
			//['shallowColor', 'u32'],
			//['deepColor', 'u32'],
			['seed', 'u32'],
		]);
		this.updateUniform();
	}

	updateUniform() {
		this.uniform.replace( {
			//shallowColor: this._shallowColor,
			//deepColor: this._deepColor,
			seed: this.seed,
		});
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}
}
