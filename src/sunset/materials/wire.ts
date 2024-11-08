import { Gfx } from "engine";
import { Color, colorToBigInt } from "engine/color";
import { Material } from "engine/material";
import { UniformBuffer } from "engine/uniform_buffer";

/**
 * Draws edges using barycentric coordinates
 */
export class WireMaterial extends Material {
	readonly uniform: UniformBuffer;
	private _faceColor: bigint;
	private _wireColor: bigint;

	constructor(
		readonly gfx: Gfx,
		faceColor: number | bigint | Color,
		wireColor: number | bigint | Color,
		public triangle: boolean = false,
	) {
		super();
		if (Array.isArray(faceColor)) {
			this._faceColor = colorToBigInt(faceColor);
		} else {
			this._faceColor = BigInt(faceColor);
		}
		if (Array.isArray(wireColor)) {
			this._wireColor = colorToBigInt(wireColor);
		} else {
			this._wireColor = BigInt(wireColor);
		}
		this.uniform = new UniformBuffer(gfx, [
			['faceColor', 'u32'],
			['wireColor', 'u32'],
			['shape', 'u32'],
		]);
		this.updateUniform();
	}

	set faceColor(color: number | bigint) {
		this._faceColor = BigInt(color);
		this.updateUniform();
	}

	set wireColor(color: number | bigint) {
		this._wireColor = BigInt(color);
		this.updateUniform();
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}

	updateUniform() {
		this.uniform.replace({
			faceColor: this._faceColor,
			wireColor: this._wireColor,
			shape: this.triangle ? 0 : 1,
		});
	}
}
