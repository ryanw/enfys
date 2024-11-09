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
	private _wireColorTop: bigint;
	private _wireColorBot: bigint;

	constructor(
		readonly gfx: Gfx,
		faceColor: number | bigint | Color,
		wireColorTop: number | bigint | Color,
		wireColorBot: number | bigint | Color,
		public triangle: boolean = false,
	) {
		super();
		if (Array.isArray(faceColor)) {
			this._faceColor = colorToBigInt(faceColor);
		} else {
			this._faceColor = BigInt(faceColor);
		}
		if (Array.isArray(wireColorTop)) {
			this._wireColorTop = colorToBigInt(wireColorTop);
		} else {
			this._wireColorTop = BigInt(wireColorTop);
		}
		if (Array.isArray(wireColorBot)) {
			this._wireColorBot = colorToBigInt(wireColorBot);
		} else {
			this._wireColorBot = BigInt(wireColorBot);
		}
		this.uniform = new UniformBuffer(gfx, [
			['faceColor', 'u32'],
			['wireColorTop', 'u32'],
			['wireColorBot', 'u32'],
			['shape', 'u32'],
		]);
		this.updateUniform();
	}

	set faceColor(color: number | bigint) {
		this._faceColor = BigInt(color);
		this.updateUniform();
	}

	set wireColorTop(color: number | bigint) {
		this._wireColorTop = BigInt(color);
		this.updateUniform();
	}

	set wireColorBot(color: number | bigint) {
		this._wireColorBot = BigInt(color);
		this.updateUniform();
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}

	updateUniform() {
		this.uniform.replace({
			faceColor: this._faceColor,
			wireColorTop: this._wireColorTop,
			wireColorBot: this._wireColorBot,
			shape: this.triangle ? 0 : 1,
		});
	}
}
